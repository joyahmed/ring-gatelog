import type { GateReport } from "@/lib/report/build";
import { busiestHours } from "@/lib/report/build";
import { localTime } from "@/lib/report/time";
import { Icon } from "./kinds";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
const join = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? ""));
const n = (k: number, one: string, many = one + "s") => `${k} ${k === 1 ? one : many}`;

/** The five-second answer: did anything need attention at the gate today, and what else happened. */
export function Verdict({ report: r, tz }: { report: GateReport; tz: string }) {
  const incidents = r.leftOpen;
  const alert = incidents.length > 0;
  const headline = alert
    ? incidents
        .map((i) =>
          i.closedAt
            ? `Gate left open ${i.minutes} min, ${localTime(i.openedAt, tz)} to ${localTime(i.closedAt, tz)}`
            : `Gate open since ${localTime(i.openedAt, tz)}, ${i.minutes} min and counting`,
        )
        .join(" · ")
    : "No incidents. The gate was never left open.";
  const busy = busiestHours(r.hourly);
  const rest = [
    n(r.visitors.length, "visitor"),
    n(r.vehicles.length, "vehicle"),
    r.night.length ? `${n(r.night.length, "night event")} (${r.night.map((e) => localTime(e.at, tz)).join(", ")})` : "no night activity",
  ];

  return (
    <section
      data-testid="report-verdict"
      className={`verdict card flex items-start gap-4 rounded-2xl border p-5 sm:p-6 ${alert ? "border-warn/50 bg-warn-soft" : "border-accent/40 bg-accent-soft"}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-card ${alert ? "text-warn" : "text-accent"}`}>
        <Icon name={alert ? "alert" : "open"} className="size-6" />
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wider ${alert ? "text-warn" : "text-accent"}`}>
          {alert ? `${n(incidents.length, "incident")} today` : "All clear today"}
        </p>
        <p className="mt-1 text-xl font-semibold tracking-tight text-balance sm:text-2xl">{headline}</p>
        <p className="mt-1.5 text-sm text-muted">
          Also: {join(rest)}.{busy.length > 0 && ` Busiest ${busy.length > 1 ? "hours" : "hour"} ${join(busy.map(hh))}.`}
        </p>
      </div>
    </section>
  );
}
