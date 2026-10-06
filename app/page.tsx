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
import { Verdict } from "./components/Verdict";

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
    <p className="card flex items-baseline gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-muted">
      <span className="size-2 shrink-0 translate-y-[-1px] rounded-full bg-warn" aria-hidden />
      <span>
      <strong className="font-semibold text-fg">Demo data.</strong>{" "}
      {replayed === total
        ? "Every event on this day comes from a replayed scripted gate day, not real gate traffic."
        : `${replayed} of ${total} events on this day come from a replayed scripted gate day, not real gate traffic. Each event is tagged with its source.`}
      </span>
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
  const showSource = new Set(report.events.map((e) => e.source)).size > 1;
  const next = day < today ? addDays(day, 1) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-10 print:max-w-none print:gap-4 print:p-0">
      <ReportHeader gate={gate} mode={mode} tz={tz} day={day} prev={addDays(day, -1)} next={next} today={today} apiError={api.error} />

      {replayed > 0 && <ReplayNotice replayed={replayed} total={report.total} />}

      {report.total === 0 ? (
        <EmptyState days={listDays(tz)} />
      ) : (
        <>
          <Verdict report={report} tz={tz} />
          <SummaryTiles report={report} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 print:grid-cols-1">
            <Section title="Summary" className="lg:col-span-2">
              <SummaryText lines={report.summary} />
            </Section>
            <Section
              title="Activity by hour"
              note={`First ${localTime(report.firstAt!, tz)} · last ${localTime(report.lastAt!, tz)}`}
              className="lg:col-span-3"
              testId="report-chart"
            >
              <HourlyChart report={report} tz={tz} />
            </Section>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 print:grid-cols-1">
            <Flagged report={report} tz={tz} showSource={showSource} />
            <Visitors report={report} tz={tz} showSource={showSource} />
          </div>
          <Timeline events={report.events} report={report} tz={tz} showSource={showSource} />
        </>
      )}

      <footer className="pt-2 text-xs text-muted">
        Built from Ring events only (motion, doorbell, contact sensor). Ring reports no package events, so this report does
        not list deliveries. Generated {localTime(now, tz)} {tz}.
      </footer>
    </main>
  );
}
