// Pure: a day's events in, a committee report out. No I/O, no clock unless passed.
// Rules live in docs/PLAN.md "Report rules". Ring has no package event, so this
// file never talks about deliveries.

import type { GateEvent, GateEventKind } from "../events/types";
import { addDays, localParts, localTime } from "./time";

export const VISITOR_WINDOW_MS = 2 * 60_000;
export const LEFT_OPEN_MS = 10 * 60_000;
export const NIGHT_START_HOUR = 22;
export const NIGHT_END_HOUR = 6;

export const KINDS: GateEventKind[] = [
  "human",
  "vehicle",
  "doorbell",
  "gate_open",
  "gate_closed",
  "motion",
  "other_motion",
  "live_view",
  "unknown",
];

export interface Visitor {
  deviceId: string;
  deviceName?: string;
  arrivedAt: string; // human motion
  rangAt: string; // doorbell press
  waitSeconds: number;
  events: [GateEvent, GateEvent];
}

export interface LeftOpenIncident {
  deviceId: string;
  deviceName?: string;
  openedAt: string;
  closedAt: string | null; // null = still open at end of data
  minutes: number;
  event: GateEvent;
}

export interface GateReport {
  day: string;
  tz: string;
  total: number;
  totals: Record<GateEventKind, number>;
  hourly: number[]; // 24 local-hour buckets, all events
  devices: string[];
  visitors: Visitor[];
  vehicles: GateEvent[];
  leftOpen: LeftOpenIncident[];
  night: GateEvent[];
  firstAt: string | null;
  lastAt: string | null;
  summary: string[];
  events: GateEvent[]; // sorted, for the timeline
}

export interface BuildOptions {
  day: string;
  tz: string;
  /** "Now" as ISO. A gate still open is measured up to min(now, end of day). */
  now?: string;
}

const ms = (iso: string) => Date.parse(iso);

/** Minutes the tz is ahead of UTC at a given instant. */
function tzOffsetMs(instant: number, tz: string): number {
  const p = localParts(new Date(instant), tz);
  const asUtc = Date.parse(`${p.day}T${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}:00Z`);
  return asUtc - Math.floor(instant / 60_000) * 60_000;
}

/** UTC instant of local midnight that starts `day`. */
export function localMidnight(day: string, tz: string): number {
  const guess = Date.parse(`${day}T00:00:00Z`);
  return guess - tzOffsetMs(guess, tz);
}

export const isNightHour = (h: number) => h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;

function findVisitors(events: GateEvent[]): Visitor[] {
  const used = new Set<string>();
  const visitors: Visitor[] = [];
  events.forEach((bell, i) => {
    if (bell.kind !== "doorbell") return;
    for (let j = i - 1; j >= 0; j--) {
      const h = events[j];
      const gap = ms(bell.at) - ms(h.at);
      if (gap > VISITOR_WINDOW_MS) break;
      if (h.kind !== "human" || h.deviceId !== bell.deviceId || used.has(h.id)) continue;
      used.add(h.id);
      visitors.push({
        deviceId: bell.deviceId,
        deviceName: bell.deviceName ?? h.deviceName,
        arrivedAt: h.at,
        rangAt: bell.at,
        waitSeconds: Math.round(gap / 1000),
        events: [h, bell],
      });
      return;
    }
  });
  return visitors;
}

function findLeftOpen(events: GateEvent[], endMs: number): LeftOpenIncident[] {
  const open = new Map<string, GateEvent>(); // deviceId -> first unclosed open
  const out: LeftOpenIncident[] = [];
  const push = (o: GateEvent, closedAt: string | null, until: number) => {
    const dur = until - ms(o.at);
    if (dur >= LEFT_OPEN_MS)
      out.push({
        deviceId: o.deviceId,
        deviceName: o.deviceName,
        openedAt: o.at,
        closedAt,
        minutes: Math.floor(dur / 60_000),
        event: o,
      });
  };
  for (const e of events) {
    if (e.kind === "gate_open" && !open.has(e.deviceId)) open.set(e.deviceId, e);
    if (e.kind === "gate_closed") {
      const o = open.get(e.deviceId);
      if (o) push(o, e.at, ms(e.at));
      open.delete(e.deviceId);
    }
  }
  for (const o of open.values()) push(o, null, Math.max(endMs, ms(o.at)));
  return out;
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

function summarize(r: Omit<GateReport, "summary">, time: (iso: string) => string): string[] {
  if (!r.total) return ["No gate activity was recorded on this day."];
  const s = [
    `${plural(r.total, "event")} recorded between ${time(r.firstAt!)} and ${time(r.lastAt!)}.`,
  ];
  const people = r.totals.human;
  const parts = [
    people && plural(people, "person detected", "people detected"),
    r.vehicles.length && plural(r.vehicles.length, "vehicle"),
    r.totals.doorbell && plural(r.totals.doorbell, "doorbell press", "doorbell presses"),
  ].filter(Boolean);
  if (parts.length) s.push(`Seen at the gate: ${parts.join(", ")}.`);
  if (r.visitors.length) s.push(`${plural(r.visitors.length, "visitor")} rang the bell at the door.`);
  const busiest = r.hourly.indexOf(Math.max(...r.hourly));
  s.push(`Busiest hour: ${String(busiest).padStart(2, "0")}:00 with ${plural(r.hourly[busiest], "event")}.`);
  for (const i of r.leftOpen)
    s.push(
      i.closedAt
        ? `Gate left open for ${i.minutes} min from ${time(i.openedAt)} to ${time(i.closedAt)}.`
        : `Gate opened at ${time(i.openedAt)} and still open after ${i.minutes} min.`,
    );
  if (r.night.length) s.push(`${plural(r.night.length, "night event")} between 22:00 and 06:00.`);
  else s.push("No night activity.");
  return s;
}

export function buildReport(input: GateEvent[], { day, tz, now }: BuildOptions): GateReport {
  const events = [...input].sort((a, b) => ms(a.at) - ms(b.at));
  const totals = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<GateEventKind, number>;
  const hourly = Array<number>(24).fill(0);
  const night: GateEvent[] = [];
  for (const e of events) {
    totals[e.kind] = (totals[e.kind] ?? 0) + 1;
    const { hour } = localParts(e.at, tz);
    hourly[hour]++;
    if ((e.kind === "human" || e.kind === "vehicle") && isNightHour(hour)) night.push(e);
  }
  const dayEnd = localMidnight(addDays(day, 1), tz);
  const endMs = now ? Math.min(ms(now), dayEnd) : dayEnd;
  const time = (iso: string) => localTime(iso, tz);

  const base = {
    day,
    tz,
    total: events.length,
    totals,
    hourly,
    devices: [...new Set(events.map((e) => e.deviceName ?? e.deviceId))],
    visitors: findVisitors(events),
    vehicles: events.filter((e) => e.kind === "vehicle"),
    leftOpen: findLeftOpen(events, endMs),
    night,
    firstAt: events[0]?.at ?? null,
    lastAt: events.at(-1)?.at ?? null,
    events,
  };
  return { ...base, summary: summarize(base, time) };
}
