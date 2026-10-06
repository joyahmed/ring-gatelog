import { appendEvents } from "../../../../lib/events/store";
import demoDevices from "../../../../fixtures/demo-devices.json";
import { listDevices } from "../../../../lib/ring/client";
import { normalizeWebhook } from "../../../../lib/ring/normalize";
import { verifySignature } from "../../../../lib/ring/signature";
import type { GateEvent } from "../../../../lib/events/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 256 * 1024;
const MAX_ITEMS = 500;
const NAMES_TTL_MS = 5 * 60_000;
let names: { at: number; map: Map<string, string> } | null = null;

async function deviceNames(): Promise<Map<string, string>> {
  if (names && Date.now() - names.at < NAMES_TTL_MS) return names.map;
  const map = new Map<string, string>();
  // Demo names come from fixtures/demo-devices.json; live names (below) win on a clash.
  let live = false;
  for (const d of demoDevices.data) map.set(d.id, d.name);
  try {
    for (const d of await listDevices()) if (d.name) map.set(d.id, d.name);
    live = true;
  } catch {
    // names are cosmetic; retry soon instead of failing the webhook
  }
  names = { at: Date.now() - (live ? 0 : NAMES_TTL_MS - 30_000), map };
  return map;
}

export async function POST(req: Request): Promise<Response> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    return Response.json({ ok: false, error: "body too large" }, { status: 413 });
  }
  const raw = Buffer.from(await req.arrayBuffer()); // raw bytes, signature is over these
  if (raw.length > MAX_BYTES) return Response.json({ ok: false, error: "body too large" }, { status: 413 });

  const secret = process.env.RING_WEBHOOK_SECRET;
  let verified = false;
  if (secret) {
    if (!verifySignature(raw, req.headers.get("x-signature"), secret)) {
      return Response.json({ ok: false, error: "bad or missing signature" }, { status: 401 });
    }
    verified = true;
  } else if (process.env.NODE_ENV === "production" && process.env.GATELOG_ALLOW_UNSIGNED !== "1") {
    return Response.json({ ok: false, error: "RING_WEBHOOK_SECRET not set - unsigned webhooks refused" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    return Response.json({ ok: false, verified, error: "invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length > MAX_ITEMS) {
    return Response.json({ ok: false, verified, error: `too many items (max ${MAX_ITEMS})` }, { status: 413 });
  }
  // Header can only downgrade trust: replayed demo events are never shown as real.
  const source = req.headers.get("x-gatelog-replay") === "1" ? "replay" : "webhook";
  const nameMap = await deviceNames();
  const events: GateEvent[] = [];
  let ignored = 0;
  for (const item of items) {
    const ev = normalizeWebhook(item, source);
    if (ev) {
      const n = nameMap.get(ev.deviceId);
      if (n) ev.deviceName = n;
      events.push(ev);
    } else ignored++;
  }
  // 200 even when nothing is usable: a 4xx would count against the endpoint, a 5xx makes Ring retry.
  try {
    if (events.length) appendEvents(events);
  } catch (e) {
    console.error("webhook: appendEvents failed", e);
    return Response.json({ ok: false, verified, error: "store failed" }, { status: 500 });
  }
  return Response.json({ ok: true, verified, stored: events.length, ignored });
}
