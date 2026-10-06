import { listDays, readEvents } from "@/lib/events/store";
import { buildReport } from "@/lib/report/build";
import { listDevices, ringMode } from "@/lib/ring/client";
import { DEFAULT_TZ, addDays, isDay, localDay, localTime } from "@/lib/report/time";
import { EmptyState } from "./components/EmptyState";
import { Flagged, Timeline, Visitors } from "./components/EventLists";
import { HourlyChart } from "./components/HourlyChart";
import { ReportHeader } from "./components/ReportHeader";
import { Section } from "./components/Section";
import { SummaryText, SummaryTiles } from "./components/SummaryTiles";

export const dynamic = "force-dynamic";

/** Device names straight from the Ring API (or its saved replay). Never throws. */
async function ringStatus(): Promise<{ devices: string[]; error?: string }> {
  try {
    return { devices: (await listDevices()).map((d) => d.name ?? d.id) };
  } catch (e) {
    const s = (e as { status?: number }).status;
    return { devices: [], error: s === 401 ? "Ring token expired" : s === 404 ? "no saved Ring response" : "Ring API unreachable" };
  }
}

function ReplayNotice({ replayed, total }: { replayed: number; total: number }) {
  return (
    <p className="card rounded-xl border border-warn/40 bg-warn-soft px-4 py-2.5 text-sm text-warn">
      <strong className="font-semibold">Demo data.</strong>{" "}
      {replayed === total ? "Every event on this day is" : `${replayed} of ${total} events on this day are`} a replayed
      scripted gate day, not real gate traffic. Each event is tagged with its source.
    </p>
  );
}

export default async function Page({ searchParams }: PageProps<"/">) {
  const tz = process.env.GATE_TZ || DEFAULT_TZ;
  const mode = ringMode();
  const now = new Date();
  const today = localDay(now, tz);
  const q = (await searchParams).day;
  const day = isDay(q) && q <= today ? q : today;

  const report = buildReport(readEvents({ day, tz }), { day, tz, now: now.toISOString() });
  const api = await ringStatus();
  const gate = api.devices.join(", ") || report.devices.join(", ") || process.env.GATE_NAME || "Gate";
  const replayed = report.events.filter((e) => e.source === "replay").length;
  const next = day < today ? addDays(day, 1) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-10 print:max-w-none print:gap-4 print:p-0">
      <ReportHeader gate={gate} mode={mode} tz={tz} day={day} prev={addDays(day, -1)} next={next} today={today} apiError={api.error} />

      {replayed > 0 && <ReplayNotice replayed={replayed} total={report.total} />}

      {report.total === 0 ? (
        <EmptyState days={listDays(tz)} />
      ) : (
        <>
          <SummaryTiles report={report} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 print:grid-cols-1">
            <Section title="Summary" className="lg:col-span-2">
              <SummaryText lines={report.summary} />
            </Section>
            <Section
              title="Activity by hour"
              note={`First ${localTime(report.firstAt!, tz)} · last ${localTime(report.lastAt!, tz)}`}
              className="lg:col-span-3"
            >
              <HourlyChart hourly={report.hourly} />
            </Section>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 print:grid-cols-1">
            <Flagged report={report} tz={tz} />
            <Visitors report={report} tz={tz} />
          </div>
          <Timeline events={report.events} tz={tz} />
        </>
      )}

      <footer className="pt-2 text-xs text-muted">
        Built from Ring events only (motion, doorbell, contact sensor). Ring reports no package events, so this report does
        not list deliveries. Generated {localTime(now, tz)} {tz}.
      </footer>
    </main>
  );
}
