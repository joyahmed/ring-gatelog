import Link from "next/link";
import { Icon } from "./kinds";

export function EmptyState({ days }: { days: string[] }) {
  return (
    <section className="card rounded-2xl border border-dashed border-line bg-card px-5 py-12 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon name="clock" className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">No gate events on this day</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Events arrive from the Ring webhook or an event-history sync. To load a scripted demo day for today, run:
      </p>
      <code className="mt-3 inline-block rounded-lg border border-line bg-bg px-3 py-1.5 font-mono text-sm">bun run replay:day</code>
      {days.length > 0 && (
        <div className="mt-6 print:hidden">
          <p className="text-xs text-muted">Days with events</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {days.slice(0, 7).map((d) => (
              <li key={d}>
                <Link href={`/?day=${d}`} className="rounded-lg border border-line px-2.5 py-1 font-mono text-xs text-accent hover:border-accent">
                  {d}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
