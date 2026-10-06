import { describe, expect, test } from "bun:test";
import { normalizeHistory, normalizeWebhook, toIso } from "./normalize";

const MS = 1786715596787;
const ISO = new Date(MS).toISOString();
const wh = (type: string, extra: Record<string, unknown> = {}, id: string | null = "dev1_x_1", ts: unknown = MS) => ({
  meta: { version: "1.1", time: ISO, request_id: "r1", account_id: "a" },
  data: { ...(id ? { id } : {}), type, attributes: { source: "dev1", source_type: "devices", timestamp: ts, ...extra } },
});

describe("normalizeWebhook kinds", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["motion_detected", { sub_type: "motion" }, "motion"],
    ["motion_detected", { sub_type: "human" }, "human"],
    ["motion_detected", { sub_type: "vehicle" }, "vehicle"],
    ["motion_detected", { sub_type: "other_motion" }, "other_motion"],
    ["motion_detected", { sub_type: "package_delivery" }, "unknown"],
    ["motion_detected", {}, "motion"],
    ["button_press", {}, "doorbell"],
    ["contact_sensor_faulted", {}, "gate_open"],
    ["contact_sensor_cleared", {}, "gate_closed"],
    ["tamper_detected", {}, "unknown"],
  ];
  for (const [type, extra, kind] of cases) {
    test(`${type} ${JSON.stringify(extra)} -> ${kind}`, () => {
      const p = wh(type, extra);
      const e = normalizeWebhook(p)!;
      expect(e.kind).toBe(kind as never);
      expect(e.deviceId).toBe("dev1");
      expect(e.at).toBe(ISO);
      expect(e.source).toBe("webhook");
      expect(e.id).toBe("dev1_x_1");
      expect(e.raw).toEqual(p);
    });
  }
  test("seconds timestamp -> same instant", () => expect(normalizeWebhook(wh("button_press", {}, "i", Math.floor(MS / 1000)))!.at).toBe(ISO.replace(/\.\d+Z/, ".000Z")));
  test("ms timestamp kept", () => expect(normalizeWebhook(wh("button_press"))!.at).toBe(ISO));
  test("hash id when no id, stable and kind-sensitive", () => {
    const a = normalizeWebhook(wh("button_press", {}, null))!;
    const b = normalizeWebhook(wh("button_press", {}, null))!;
    const c = normalizeWebhook(wh("contact_sensor_faulted", {}, null))!;
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(c.id);
  });
  test("device from relationships link when no source", () => {
    const p = wh("button_press");
    delete (p.data.attributes as Obj).source;
    (p.data as Obj).relationships = { devices: { links: { self: "/v1/devices/devZ" } } };
    expect(normalizeWebhook(p)!.deviceId).toBe("devZ");
  });
  test("falls back to meta.time when no timestamp", () => {
    const p = wh("button_press");
    delete (p.data.attributes as Obj).timestamp;
    expect(normalizeWebhook(p)!.at).toBe(ISO);
  });
  test("garbage -> null", () => {
    for (const g of [null, 5, "x", [], {}, { data: {} }]) expect(normalizeWebhook(g)).toBeNull();
  });
});
type Obj = Record<string, unknown>;

describe("toIso", () => {
  test("s vs ms vs ISO vs numeric string", () => {
    expect(toIso(1771027372)).toBe("2026-02-14T00:02:52.000Z");
    expect(toIso(1771027372393)).toBe("2026-02-14T00:02:52.393Z");
    expect(toIso("2026-02-14T00:02:52Z")).toBe("2026-02-14T00:02:52.000Z");
    expect(toIso("1771027372393")).toBe("2026-02-14T00:02:52.393Z");
    expect(toIso(NaN)).toBeNull();
    expect(toIso(undefined)).toBeNull();
  });
});

describe("normalizeHistory", () => {
  const row = (id: string, event_type: string, start: number) => ({
    type: "history-events", id, attributes: { event_type, is_third_party_reviewed: false, start, end: start + 1000 },
    relationships: { source: { data: { type: "devices", id: "devH" } } },
  });
  const body = { data: [row("e1", "on_demand", 1699457230000), row("e2", "motion", 1699457200000), row("e3", "ding", 1699457100000), row("e4", "weird", 1699457000000)] };
  test("maps types", () => {
    const evs = normalizeHistory(body, { deviceId: "d0", deviceName: "Gate" });
    expect(evs.map((e) => e.kind)).toEqual(["live_view", "motion", "doorbell", "unknown"]);
    expect(evs.map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4"]);
    expect(evs[0].at).toBe("2023-11-08T15:27:10.000Z");
    expect(evs.every((e) => e.source === "history" && e.deviceId === "devH" && e.deviceName === "Gate")).toBe(true);
  });
  test("kind override only on motion rows", () => {
    const evs = normalizeHistory(body, { deviceId: "d0", kind: "human" });
    expect(evs.map((e) => e.kind)).toEqual(["live_view", "human", "doorbell", "unknown"]);
  });
  test("non-motion override ignored", () => expect(normalizeHistory(body, { deviceId: "d0", kind: "gate_open" })[1].kind).toBe("motion"));
  test("falls back to opts.deviceId; bad input -> []", () => {
    const r = row("e9", "ding", 1699457100000) as Obj;
    delete r.relationships;
    expect(normalizeHistory({ data: [r] }, { deviceId: "d0" })[0].deviceId).toBe("d0");
    expect(normalizeHistory(null, { deviceId: "d0" })).toEqual([]);
    expect(normalizeHistory({ data: [] }, { deviceId: "d0" })).toEqual([]);
  });
});

describe("normalizeWebhook source", () => {
  test("defaults to webhook, accepts replay", () => {
    expect(normalizeWebhook(wh("button_press"))!.source).toBe("webhook");
    expect(normalizeWebhook(wh("button_press"), "replay")!.source).toBe("replay");
  });
});
