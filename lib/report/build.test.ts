import { describe, expect, test } from "bun:test";
import type { GateEvent, GateEventKind } from "../events/types";
import { buildReport, busiestHours, localMidnight } from "./build";
import { addDays, localDay, localTime } from "./time";

const TZ = "Asia/Dhaka"; // UTC+6, no DST
const DAY = "2026-10-06";

let n = 0;
/** Event at local Dhaka time "HH:MM[:SS]" on DAY (or another day). */
function ev(kind: GateEventKind, hhmm: string, opts: Partial<GateEvent> & { day?: string } = {}): GateEvent {
  const [h, m, s = "00"] = hhmm.split(":");
  const day = opts.day ?? DAY;
  const at = new Date(Date.parse(`${day}T${h}:${m}:${s}+06:00`)).toISOString();
  return { id: `e${++n}`, deviceId: "gate-1", deviceName: "Front Gate", kind, at, source: "replay", ...opts };
}
const report = (events: GateEvent[], now?: string) => buildReport(events, { day: DAY, tz: TZ, now });

describe("time helpers", () => {
  test("midnight boundary in Asia/Dhaka", () => {
    expect(localDay("2026-10-05T17:59:59Z", TZ)).toBe("2026-10-05");
    expect(localDay("2026-10-05T18:00:00Z", TZ)).toBe("2026-10-06");
    expect(localTime("2026-10-05T18:00:00Z", TZ)).toBe("00:00");
    expect(new Date(localMidnight(DAY, TZ)).toISOString()).toBe("2026-10-05T18:00:00.000Z");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("totals and hourly", () => {
  test("counts by kind and buckets by local hour", () => {
    const r = report([ev("human", "00:05"), ev("vehicle", "09:10"), ev("vehicle", "09:50"), ev("doorbell", "23:59")]);
    expect(r.total).toBe(4);
    expect(r.totals.vehicle).toBe(2);
    expect(r.totals.human).toBe(1);
    expect(r.totals.gate_open).toBe(0);
    expect(r.hourly).toHaveLength(24);
    expect(r.hourly[0]).toBe(1);
    expect(r.hourly[9]).toBe(2);
    expect(r.hourly[23]).toBe(1);
  });

  test("first/last activity and sorted timeline from unsorted input", () => {
    const late = ev("human", "18:00");
    const early = ev("vehicle", "07:00");
    const r = report([late, early]);
    expect(r.firstAt).toBe(early.at);
    expect(r.lastAt).toBe(late.at);
    expect(r.events.map((e) => e.id)).toEqual([early.id, late.id]);
  });

  test("empty day", () => {
    const r = report([]);
    expect(r.total).toBe(0);
    expect(r.firstAt).toBeNull();
    expect(r.summary).toEqual(["No gate activity was recorded on this day."]);
  });
});

describe("visitors", () => {
  test("human then doorbell within 2 min is a visitor", () => {
    const r = report([ev("human", "10:00:00"), ev("doorbell", "10:01:30")]);
    expect(r.visitors).toHaveLength(1);
    expect(r.visitors[0].waitSeconds).toBe(90);
  });

  test("exactly 2:00 counts, 2:01 does not", () => {
    expect(report([ev("human", "10:00:00"), ev("doorbell", "10:02:00")]).visitors).toHaveLength(1);
    expect(report([ev("human", "10:00:00"), ev("doorbell", "10:02:01")]).visitors).toHaveLength(0);
  });

  test("doorbell before human, or on another device, is not a visitor", () => {
    expect(report([ev("doorbell", "10:00"), ev("human", "10:01")]).visitors).toHaveLength(0);
    expect(report([ev("human", "10:00"), ev("doorbell", "10:01", { deviceId: "gate-2" })]).visitors).toHaveLength(0);
  });

  test("vehicle motion before doorbell is not a visitor", () => {
    expect(report([ev("vehicle", "10:00"), ev("doorbell", "10:01")]).visitors).toHaveLength(0);
  });

  test("one human pressing twice is one visitor", () => {
    expect(report([ev("human", "10:00"), ev("doorbell", "10:00:30"), ev("doorbell", "10:01")]).visitors).toHaveLength(1);
  });
});

describe("vehicles", () => {
  test("every vehicle motion is listed", () => {
    expect(report([ev("vehicle", "08:00"), ev("human", "08:01"), ev("vehicle", "17:30")]).vehicles).toHaveLength(2);
  });
});

describe("gate left open", () => {
  test("open 10+ min then closed is an incident with duration", () => {
    const r = report([ev("gate_open", "12:00"), ev("gate_closed", "12:14")]);
    expect(r.leftOpen).toHaveLength(1);
    expect(r.leftOpen[0].minutes).toBe(14);
    expect(r.leftOpen[0].closedAt).not.toBeNull();
  });

  test("closed after 9 min is fine; exactly 10 min counts", () => {
    expect(report([ev("gate_open", "12:00"), ev("gate_closed", "12:09:59")]).leftOpen).toHaveLength(0);
    expect(report([ev("gate_open", "12:00"), ev("gate_closed", "12:10")]).leftOpen).toHaveLength(1);
  });

  test("gate reopened: short cycle ignored, second open left long is flagged", () => {
    const r = report([ev("gate_open", "12:00"), ev("gate_closed", "12:03"), ev("gate_open", "12:05"), ev("gate_closed", "12:20")]);
    expect(r.leftOpen).toHaveLength(1);
    expect(r.leftOpen[0].minutes).toBe(15);
    expect(localTime(r.leftOpen[0].openedAt, TZ)).toBe("12:05");
  });

  test("duplicate open without close keeps the first open time", () => {
    const r = report([ev("gate_open", "12:00"), ev("gate_open", "12:06"), ev("gate_closed", "12:11")]);
    expect(r.leftOpen[0].minutes).toBe(11);
  });

  test("still open at end of data counts, measured to now", () => {
    const now = new Date(Date.parse(`${DAY}T21:30:00+06:00`)).toISOString();
    const r = report([ev("gate_open", "21:00")], now);
    expect(r.leftOpen).toHaveLength(1);
    expect(r.leftOpen[0].closedAt).toBeNull();
    expect(r.leftOpen[0].minutes).toBe(30);
  });

  test("still open on a past day is measured to local midnight", () => {
    const r = report([ev("gate_open", "23:00")], "2030-01-01T00:00:00Z");
    expect(r.leftOpen[0].minutes).toBe(60);
  });

  test("open only 5 min before now is not yet an incident", () => {
    const now = new Date(Date.parse(`${DAY}T21:05:00+06:00`)).toISOString();
    expect(report([ev("gate_open", "21:00")], now).leftOpen).toHaveLength(0);
  });

  test("devices are tracked separately", () => {
    const r = report([ev("gate_open", "12:00"), ev("gate_closed", "12:02", { deviceId: "gate-2" }), ev("gate_closed", "12:30")]);
    expect(r.leftOpen).toHaveLength(1);
    expect(r.leftOpen[0].minutes).toBe(30);
  });
});

describe("night activity", () => {
  test("human/vehicle between 22:00 and 06:00 local", () => {
    const r = report([
      ev("human", "00:30"),
      ev("vehicle", "05:59"),
      ev("human", "06:00"),
      ev("vehicle", "21:59"),
      ev("human", "22:00"),
      ev("doorbell", "23:00"),
      ev("gate_open", "23:10"),
    ]);
    expect(r.night.map((e) => localTime(e.at, TZ))).toEqual(["00:30", "05:59", "22:00"]);
  });
});

describe("summary", () => {
  test("plain English, no delivery claims", () => {
    const r = report([
      ev("human", "10:00"),
      ev("doorbell", "10:01"),
      ev("vehicle", "10:30"),
      ev("gate_open", "11:00"),
      ev("gate_closed", "11:25"),
      ev("human", "23:00"),
    ]);
    const text = r.summary.join(" ");
    expect(text).toContain("6 events recorded between 10:00 and 23:00.");
    expect(text).toContain("1 visitor rang the bell");
    expect(text).toContain("Gate left open for 25 min from 11:00 to 11:25.");
    expect(text).toContain("1 night event");
    expect(text).toContain("Busiest hour: 10:00 with 3 events.");
    expect(text.toLowerCase()).not.toMatch(/deliver|package|parcel/);
  });

  test("busiest hours that tie are all named", () => {
    const r = report([
      ev("vehicle", "08:05"),
      ev("vehicle", "08:20"),
      ev("human", "12:00"),
      ev("vehicle", "18:10"),
      ev("vehicle", "18:25"),
    ]);
    expect(busiestHours(r.hourly)).toEqual([8, 18]);
    expect(r.summary.join(" ")).toContain("Busiest hours: 08:00 and 18:00 with 2 events each.");
    expect(busiestHours(Array(24).fill(0))).toEqual([]);
  });
});
