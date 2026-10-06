import { timingSafeEqual } from "node:crypto";
import { appendEvents, listDays, readEvents } from "../../../../lib/events/store";
import type { GateEvent } from "../../../../lib/events/types";
import { getHistory, listDevices, ringGet, ringMode } from "../../../../lib/ring/client";
import { HISTORY_TYPES, MAX_PAGES, splitNext } from "../../../../lib/ring/fixtures";
import { ambiguousIds, countMismatched, topType } from "../../../../lib/ring/history";
import { normalizeHistory } from "../../../../lib/ring/normalize";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = 30_000;
const DEDUPE_MS = 5_000;
let lastSync = 0;

function keyOk(req: Request): boolean {
  const want = process.env.SYNC_KEY;
  if (!want) return process.env.NODE_ENV !== "production";
  const got = req.headers.get("x-sync-key") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const mode = ringMode();
  if (!keyOk(req)) return Response.json({ mode, error: "sync key required" }, { status: 401 });
  const now = Date.now();
  if (now - lastSync < COOLDOWN_MS) {
    return Response.json({ mode, error: "sync cooldown, try again in 30s" }, { status: 429 });
  }
  lastSync = now;
  try {
    const devices = await listDevices();
    const perType: Record<string, number> = {};
    const seen = new Set<string>();
    let added = 0;
    let dropped = 0;
    // Stored events by device+kind, for cross-source dedupe (webhook/replay vs history).
    const known = new Map<string, number[]>();
    const remember = (e: GateEvent) => {
      const k = `${e.deviceId}|${e.kind}`;
      (known.get(k) ?? known.set(k, []).get(k)!).push(Date.parse(e.at));
    };
    for (const day of listDays()) readEvents({ day }).forEach(remember);
    const isDup = (e: GateEvent) => {
      const t = Date.parse(e.at);
      return (known.get(`${e.deviceId}|${e.kind}`) ?? []).some((x) => Math.abs(x - t) <= DEDUPE_MS);
    };

    let filterIgnored = false;
    for (const d of devices) {
      // Pass 1: fetch every filter's pages. The sandbox ignores event_types, so rows of the wrong
      // type are dropped here (their own pass picks them up).
      const passes: { t: (typeof HISTORY_TYPES)[number]; events: GateEvent[]; truncated: boolean }[] = [];
      for (const t of HISTORY_TYPES) {
        const events: GateEvent[] = [];
        let truncated = false;
        try {
          let page: unknown = await getHistory(d.id, t.eventTypes);
          for (let i = 0; ; i++) {
            if (countMismatched(page, t.eventTypes) > 0) filterIgnored = true;
            events.push(...normalizeHistory(page, { deviceId: d.id, deviceName: d.name, kind: t.kind, eventType: topType(t.eventTypes) }));
            const rows = (page as { data?: unknown[] }).data ?? [];
            const next = (page as { links?: { next?: string } }).links?.next;
            if (!next || rows.length === 0) break;
            if (i + 1 >= MAX_PAGES) {
              truncated = true;
              break;
            }
            const n = splitNext(next, { event_types: t.eventTypes });
            page = await ringGet(n.path, n.query);
          }
        } catch (e) {
          // replay mode: a device may have no recorded history. Anything else is real.
          if (mode === "replay" && (e as { status?: number }).status === 404) continue;
          throw e;
        }
        passes.push({ t, events, truncated });
      }
      // A motion row returned for more than one sub-type filter: the filter was ignored, kind "motion".
      const ambiguous = ambiguousIds(passes.map((p) => ({ kind: p.t.kind, events: p.events })));
      if (ambiguous.size) filterIgnored = true;

      let cutoff = -Infinity; // oldest time reached by a subtype pass that hit MAX_PAGES
      for (const { t, events, truncated } of passes) {
        const bare = t.eventTypes === "motion";
        const fresh: GateEvent[] = [];
        let oldest = Infinity;
        for (const ev of events) {
          oldest = Math.min(oldest, Date.parse(ev.at));
          if (bare && Date.parse(ev.at) < cutoff) continue;
          if (ambiguous.has(`${ev.deviceId}|${ev.id}`)) ev.kind = "motion";
          const key = `${ev.deviceId}|${ev.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (isDup(ev)) {
            dropped++;
            continue;
          }
          fresh.push(ev);
        }
        if (truncated && !bare && Number.isFinite(oldest)) cutoff = Math.max(cutoff, oldest);
        // Count what was really added, per resulting kind (not per filter asked).
        for (const kind of new Set(fresh.map((e) => e.kind))) {
          const group = fresh.filter((e) => e.kind === kind);
          const r = appendEvents(group);
          group.forEach(remember);
          perType[kind] = (perType[kind] ?? 0) + r.added;
          added += r.added;
        }
      }
    }
    return Response.json({ mode, devices: devices.length, added, dropped, perType, filterIgnored });
  } catch (e) {
    console.error("sync failed", e);
    const status = (e as { status?: number }).status === 401 ? 401 : 502;
    return Response.json({ mode, error: status === 401 ? "token expired - get a fresh Playground token" : "upstream error" }, { status });
  }
}
