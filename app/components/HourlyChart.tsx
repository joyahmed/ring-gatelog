import type { GateReport } from "@/lib/report/build";
import { busiestHours, isNightHour } from "@/lib/report/build";
import { localParts, localTime } from "@/lib/report/time";

const hh = (h: number) => String(h).padStart(2, "0");
const DAY_MIN = 24 * 60;

/** Local minute-of-day, so a span can be placed on the same 24h axis as the bars. */
const minuteOfDay = (iso: string, tz: string) => {
  const p = localParts(iso, tz);
  return p.hour * 60 + p.minute;
};

interface Span {
  key: string;
  from: number;
  to: number;
  label: string;
  incident: boolean;
}

/** Every open->close pair per device; incidents (left open) are the ones the report flagged. */
function gateSpans(r: GateReport, tz: string): Span[] {
  const incident = new Set(r.leftOpen.map((i) => i.event.id));
  const open = new Map<string, GateReport["events"][number]>();
  const spans: Span[] = [];
  const add = (o: GateReport["events"][number], closedAt: string | null) => {
    const from = minuteOfDay(o.at, tz);
    const to = closedAt ? Math.max(from + 1, minuteOfDay(closedAt, tz)) : DAY_MIN;
    spans.push({
      key: o.id,
      from,
      to,
      incident: incident.has(o.id),
      label: `Gate open ${localTime(o.at, tz)}${closedAt ? `-${localTime(closedAt, tz)}` : ", not closed"}`,
    });
  };
  for (const e of r.events) {
    if (e.kind === "gate_open" && !open.has(e.deviceId)) open.set(e.deviceId, e);
    if (e.kind === "gate_closed" && open.has(e.deviceId)) {
      add(open.get(e.deviceId)!, e.at);
      open.delete(e.deviceId);
    }
  }
  for (const o of open.values()) add(o, null);
  return spans;
}

export function HourlyChart({ report: r, tz }: { report: GateReport; tz: string }) {
  const { hourly } = r;
  const max = Math.max(1, ...hourly);
  const top = new Set(busiestHours(hourly));
  const spans = gateSpans(r, tz);
  return (
    <figure>
      <div className="grid h-40 grid-cols-24 items-end gap-[3px] sm:gap-1" role="img" aria-label="Events per hour">
        {hourly.map((n, h) => (
          <div
            key={h}
            className={`flex h-full flex-col justify-end rounded-t-sm ${isNightHour(h) ? "bg-night-band" : ""}`}
            title={`${hh(h)}:00 - ${n} event${n === 1 ? "" : "s"}`}
          >
            {n > 0 && (
              <>
                <span
                  className={`hidden pb-0.5 text-center text-[10px] tabular-nums sm:block ${top.has(h) ? "font-semibold text-fg" : "text-muted"}`}
                >
                  {n}
                </span>
                <span
                  className={`w-full rounded-t-[3px] ${isNightHour(h) ? "bg-night" : top.has(h) ? "bg-accent-strong" : "bg-accent"}`}
                  style={{ height: `${Math.max(4, (n / max) * 85)}%` }}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {spans.length > 0 && (
        <div className="relative mt-1 h-3.5 rounded-sm bg-night-band/70" aria-label="Gate open periods">
          {spans.map((s) => (
            <span
              key={s.key}
              title={s.label}
              className={`absolute top-0 h-full rounded-sm ${s.incident ? "bg-warn" : "bg-muted/50"}`}
              style={{ left: `${(s.from / DAY_MIN) * 100}%`, width: `max(3px, ${((s.to - s.from) / DAY_MIN) * 100}%)` }}
            />
          ))}
        </div>
      )}

      <div className="mt-1.5 grid grid-cols-24 gap-[3px] text-[10px] tabular-nums text-muted sm:gap-1">
        {hourly.map((_, h) => (
          <span key={h} className="text-center">
            {h % 3 === 0 ? hh(h) : ""}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {[
          ["bg-accent", "Day 06:00-22:00"],
          ["bg-night", "Night 22:00-06:00"],
          ...(spans.length ? [["bg-muted/50", "Gate open"]] : []),
          ...(r.leftOpen.length ? [["bg-warn", "Left open 10+ min"]] : []),
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${c}`} /> {l}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
