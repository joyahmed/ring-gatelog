import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ambiguousIds, countMismatched, topType } from "./history";
import { normalizeHistory } from "./normalize";

const row = (id: string, event_type: string, start = 1790699343923) => ({
  type: "history-events", id, attributes: { event_type, is_third_party_reviewed: true, start, end: start + 1000 },
  relationships: { source: { data: { type: "devices", id: "devL" } }, cv_detections: { data: [] } }, meta: { riid: null },
});
// What the live sandbox did: the same rows for every filter, all on_demand.
const live = { data: [row("r1", "on_demand"), row("r2", "on_demand", 1790699000000)] };

describe("filter is not trusted", () => {
  test("topType", () => {
    expect([topType("motion.human"), topType("motion"), topType("ding"), topType("on_demand")]).toEqual(["motion", "motion", "ding", "on_demand"]);
  });
  test("rows of the wrong type are dropped, matching ones kept", () => {
    for (const f of ["motion.human", "motion.vehicle", "motion.other_motion", "motion", "ding"]) {
      expect(normalizeHistory(live, { deviceId: "devL", eventType: topType(f) })).toEqual([]);
      expect(countMismatched(live, f)).toBe(2);
    }
    const od = normalizeHistory(live, { deviceId: "devL", eventType: topType("on_demand") });
    expect(od.map((e) => e.kind)).toEqual(["live_view", "live_view"]);
    expect(countMismatched(live, "on_demand")).toBe(0);
  });
  test("a motion row in more than one sub-type response is ambiguous", () => {
    const body = { data: [row("m1", "motion"), row("m2", "motion")] };
    const only = { data: [row("m3", "motion")] };
    const ev = (b: unknown, kind: "human" | "vehicle") => normalizeHistory(b, { deviceId: "devL", kind, eventType: "motion" });
    const amb = ambiguousIds([
      { kind: "human", events: ev(body, "human") },
      { kind: "vehicle", events: [...ev(body, "vehicle"), ...ev(only, "vehicle")] },
      { kind: "motion", events: ev(body, "human") }, // bare pass does not count
    ]);
    expect([...amb].sort()).toEqual(["devL|m1", "devL|m2"]);
  });
});

describe("POST /api/ring/sync against the live-recorded fixtures", () => {
  let tmp = "";
  const saved = { ...process.env };
  beforeAll(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "gatelog-sync-"));
    process.env.RING_MODE = "replay";
    delete process.env.RING_FIXTURE_DIR;
    delete process.env.SYNC_KEY;
    process.env.GATELOG_DATA_DIR = tmp;
  });
  afterAll(() => {
    process.env = saved;
    rmSync(tmp, { recursive: true, force: true });
  });
  test("every filter returns the same on_demand rows: only live_view is added, filterIgnored is true", async () => {
    const { POST } = await import("../../app/api/ring/sync/route");
    const res = await POST(new Request("http://x/api/ring/sync", { method: "POST" }));
    const j = (await res.json()) as { added: number; perType: Record<string, number>; filterIgnored: boolean; devices: number };
    expect(res.status).toBe(200);
    expect(j.devices).toBe(1);
    expect(j.added).toBe(14);
    expect(j.perType).toEqual({ live_view: 14 });
    expect(j.filterIgnored).toBe(true);
  });
});
