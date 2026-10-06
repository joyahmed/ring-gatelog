import { isNightHour } from "@/lib/report/build";

const hh = (h: number) => String(h).padStart(2, "0");

export function HourlyChart({ hourly }: { hourly: number[] }) {
  const max = Math.max(1, ...hourly);
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
                <span className="hidden pb-0.5 text-center text-[10px] tabular-nums text-muted sm:block">{n}</span>
                <span
                  className={`w-full rounded-t-[3px] ${isNightHour(h) ? "bg-night" : "bg-accent"}`}
                  style={{ height: `${Math.max(4, (n / max) * 85)}%` }}
                />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-24 gap-[3px] text-[10px] tabular-nums text-muted sm:gap-1">
        {hourly.map((_, h) => (
          <span key={h} className="text-center">
            {h % 3 === 0 ? hh(h) : ""}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        {[
          ["bg-accent", "Day 06:00-22:00"],
          ["bg-night", "Night 22:00-06:00"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${c}`} /> {l}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
