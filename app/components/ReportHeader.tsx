import Link from "next/link";
import { Icon } from "./kinds";
import { PrintButton } from "./PrintButton";

const fmtDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const navBtn = "grid size-9 place-items-center rounded-lg border border-line bg-card text-fg hover:border-accent hover:text-accent";

export function ReportHeader({
  gate,
  mode,
  tz,
  day,
  prev,
  next,
  today,
  apiError,
}: {
  gate: string;
  mode: string;
  tz: string;
  day: string;
  prev: string;
  next: string | null;
  today: string;
  apiError?: string;
}) {
  const live = mode === "live" || mode === "record";
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-fg print:hidden">
            <Icon name="open" className="size-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">GateLog</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${live ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}
          >
            {live ? `● ${mode}` : mode}
          </span>
          {apiError && (
            <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">{apiError}</span>
          )}
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{fmtDay(day)}</p>
        <p className="mt-1 text-sm text-muted">
          Daily gate report · <span className="text-fg">{gate}</span> · times in {tz}
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-2 print:hidden" aria-label="Choose day">
        <Link href={`/?day=${prev}`} className={navBtn} aria-label="Previous day">
          <Icon name="chevronL" />
        </Link>
        <form className="flex items-center gap-2" action="/">
          <input
            type="date"
            name="day"
            defaultValue={day}
            max={today}
            className="h-9 rounded-lg border border-line bg-card px-2 text-sm text-fg"
            aria-label="Day"
          />
          <button className="h-9 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg hover:opacity-90">Go</button>
        </form>
        {next ? (
          <Link href={`/?day=${next}`} className={navBtn} aria-label="Next day">
            <Icon name="chevronR" />
          </Link>
        ) : (
          <span className={`${navBtn} pointer-events-none opacity-40`} aria-hidden>
            <Icon name="chevronR" />
          </span>
        )}
        {day !== today && (
          <Link href="/" className="h-9 rounded-lg px-2 text-sm leading-9 text-accent hover:underline">
            Today
          </Link>
        )}
        <PrintButton />
      </nav>
    </header>
  );
}
