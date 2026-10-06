// Server-only Ring Partner API client. Never import from a client component.
// Modes: live = real call, record = real call + save JSON, replay = saved JSON, no network.
import { promises as fs } from "node:fs";
import path from "node:path";

export type RingMode = "live" | "record" | "replay";

export class RingError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "RingError";
    this.status = status;
  }
}

export function ringMode(): RingMode {
  const m = (process.env.RING_MODE ?? "replay").toLowerCase();
  return m === "live" || m === "record" ? m : "replay";
}

function apiBase(): string {
  return (process.env.RING_API_BASE || "https://api.amazonvision.com").replace(/\/+$/, "");
}

export function fixtureDir(): string {
  return process.env.RING_FIXTURE_DIR || path.join(process.cwd(), "fixtures", "recorded");
}

/** Safe file name for a path + query, e.g. v1_history_devices_X_events__event_types=motion.human.json */
export function fixtureName(p: string, query?: Record<string, string>): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9._=-]+/g, "_").replace(/^_+|_+$/g, "");
  let name = clean(p);
  const keys = Object.keys(query ?? {}).sort();
  if (keys.length) name += "__" + keys.map((k) => `${clean(k)}=${clean(query![k])}`).join("__");
  return name + ".json";
}

function buildUrl(p: string, query?: Record<string, string>): string {
  const u = new URL(apiBase() + (p.startsWith("/") ? p : "/" + p));
  for (const [k, v] of Object.entries(query ?? {})) u.searchParams.set(k, v);
  return u.toString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function liveGet(p: string, query?: Record<string, string>): Promise<unknown> {
  const token = process.env.RING_TOKEN;
  if (!token) throw new RingError("RING_TOKEN is not set - paste a Playground token into .env.local", 401);
  const url = buildUrl(p, query);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (res.status === 429 && attempt < 2) {
      const wait = Math.min(Math.max(Number(res.headers.get("Retry-After")) || 1, 0), 10);
      await sleep(wait * 1000);
      continue;
    }
    const text = await res.text();
    let body: unknown = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      /* non-JSON body */
    }
    if (res.status === 401) {
      throw new RingError("Ring token expired - get a fresh Playground token and set RING_TOKEN", 401);
    }
    if (!res.ok) {
      const e = (body as { errors?: { title?: string; detail?: string }[] } | undefined)?.errors?.[0];
      const msg = e ? [e.title, e.detail].filter(Boolean).join(": ") : text.slice(0, 200) || res.statusText;
      throw new RingError(`Ring ${res.status} on ${p}: ${msg}`, res.status);
    }
    if (body === undefined) throw new RingError(`Ring returned a non-JSON body on ${p}`, res.status);
    return body;
  }
}

export async function ringGet(p: string, query?: Record<string, string>): Promise<unknown> {
  const mode = ringMode();
  const file = path.join(fixtureDir(), fixtureName(p, query));
  if (mode === "replay") {
    let text: string;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      throw new RingError(
        `No recorded fixture ${path.basename(file)} - run once with RING_MODE=record and a fresh token`,
        404,
      );
    }
    return JSON.parse(text);
  }
  const body = await liveGet(p, query);
  if (mode === "record") {
    await fs.mkdir(fixtureDir(), { recursive: true });
    await fs.writeFile(file, JSON.stringify(body, null, 2) + "\n");
  }
  return body;
}

export async function listDevices(): Promise<{ id: string; name?: string }[]> {
  const body = (await ringGet("/v1/devices")) as {
    data?: { id?: string; attributes?: { name?: string } }[];
  };
  return (body.data ?? [])
    .filter((d) => typeof d.id === "string")
    .map((d) => ({ id: d.id as string, name: d.attributes?.name }));
}

export function getHistory(deviceId: string, eventTypes?: string): Promise<unknown> {
  const query = eventTypes ? { event_types: eventTypes } : undefined;
  return ringGet(`/v1/history/devices/${deviceId}/events`, query);
}
