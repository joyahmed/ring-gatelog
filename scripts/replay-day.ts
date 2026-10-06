// Replays fixtures/gate-day.json to the webhook, shifted to a chosen local day.
// Usage: bun scripts/replay-day.ts [--day YYYY-MM-DD] [--url URL] [--dry-run] [--fast]
import { createHmac, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface FxEvent { t: string; device: string; type: string; sub_type?: string }
interface Fixture {
  tz: string;
  devices: Record<string, { id: string; name: string }>;
  account_id: string;
  events: FxEvent[];
}

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const TZ = process.env.GATE_TZ || "Asia/Dhaka";

function dayInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function offsetMs(utcMs: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Local wall-clock "YYYY-MM-DD" + "HH:MM:SS" in tz -> epoch ms. */
function localToEpoch(day: string, hms: string, tz: string): number {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi, s] = hms.split(":").map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  let guess = naive - offsetMs(naive, tz);
  guess = naive - offsetMs(guess, tz);
  return guess;
}

const day = opt("day") || dayInTz(new Date(), TZ);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
  console.error(`bad --day "${day}", want YYYY-MM-DD`);
  process.exit(1);
}
const url = opt("url") || "http://localhost:3000/api/ring/webhook";
const secret = process.env.RING_WEBHOOK_SECRET;
const dry = flag("dry-run");
const fast = flag("fast");

const fx: Fixture = JSON.parse(readFileSync(join(import.meta.dir, "..", "fixtures", "gate-day.json"), "utf8"));

function requestId(id: string): string {
  const h = createHash("sha256").update(id).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function build(e: FxEvent) {
  const dev = fx.devices[e.device];
  const ts = localToEpoch(day, e.t, TZ);
  const isMotion = e.type === "motion_detected";
  const idPart = isMotion ? e.sub_type! : e.type;
  const id = `${dev.id}_${idPart}_${ts}`;
  const attributes: Record<string, unknown> = {
    source: dev.id, source_type: "devices", timestamp: ts,
  };
  if (isMotion) {
    attributes.timestamp_readable = new Date(ts + offsetMs(ts, TZ)).toISOString().slice(0, 19).replace("T", " ");
    attributes.sub_type = e.sub_type;
  }
  return {
    meta: { version: "1.1", time: new Date(ts).toISOString(), request_id: requestId(id), account_id: fx.account_id },
    data: {
      id, type: e.type, attributes,
      relationships: { devices: { links: { self: `/v1/devices/${dev.id}` } } },
    },
  };
}

const kindOf = (p: ReturnType<typeof build>) =>
  p.data.type === "motion_detected" ? `motion.${p.data.attributes.sub_type}` : p.data.type;

const payloads = fx.events.map(build).sort((a, b) => (a.data.attributes.timestamp as number) - (b.data.attributes.timestamp as number));
const counts: Record<string, number> = {};
for (const p of payloads) counts[kindOf(p)] = (counts[kindOf(p)] || 0) + 1;

function summary(extra = "") {
  console.log(`day ${day} tz ${TZ}: ${payloads.length} payloads${extra}`);
  for (const [k, v] of Object.entries(counts).sort()) console.log(`  ${k.padEnd(28)} ${v}`);
}

if (dry) {
  for (const p of payloads) console.log(JSON.stringify(p));
  summary(" (dry run, nothing sent)");
  process.exit(0);
}

let ok = 0, fail = 0;
for (const p of payloads) {
  const body = JSON.stringify(p);
  const headers: Record<string, string> = { "content-type": "application/json", "x-gatelog-replay": "1" };
  if (secret) headers["x-signature"] = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    const res = await fetch(url, { method: "POST", headers, body });
    if (res.ok) ok++;
    else { fail++; console.error(`${res.status} for ${p.data.id}`); }
  } catch (err) {
    fail++;
    console.error(`send failed for ${p.data.id}: ${(err as Error).message}`);
  }
  if (!fast) await Bun.sleep(150);
}
summary(`, sent ${ok} ok, ${fail} failed${secret ? ", signed" : ", unsigned (RING_WEBHOOK_SECRET not set)"}`);
process.exit(fail ? 1 : 0);
