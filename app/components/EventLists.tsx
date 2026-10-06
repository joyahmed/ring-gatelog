import type { GateEvent } from "@/lib/events/types";
import type { GateReport } from "@/lib/report/build";
import { isNightHour } from "@/lib/report/build";
import { localParts, localTime } from "@/lib/report/time";
import { Icon, KIND_META, KindBadge, SourceTag } from "./kinds";
import { Muted, Section } from "./Section";

/** showSource: tag each row with its source only when the day mixes sources (otherwise the notice says it once). */
type Common = { tz: string; showSource?: boolean };

function Row({ time, badge, title, sub, tag, tone = "" }: { time: string; badge: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; tag?: React.ReactNode; tone?: string }) {
  return (
    <li className={`flex items-center gap-3 py-2.5 ${tone}`}>
      <time className="w-11 shrink-0 font-mono text-sm tabular-nums text-muted">{time}</time>
      {badge}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </div>
      {tag}
    </li>
  );
}

const List = ({ children }: { children: React.ReactNode }) => <ul className="timeline divide-y divide-line">{children}</ul>;

const Tile = ({ icon, tone }: { icon: "alert" | "moon"; tone: string }) => (
  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${tone}`}>
    <Icon name={icon} />
  </span>
);

export function Flagged({ report: r, tz, showSource }: { report: GateReport } & Common) {
  const none = !r.leftOpen.length && !r.night.length;
  return (
    <Section title="Flagged" note="Gate open 10+ min · people or vehicles 22:00-06:00" testId="report-flagged">
      {none ? (
        <Muted>Nothing flagged. The gate was never left open and there was no night activity.</Muted>
      ) : (
        <div className="space-y-3">
          {r.leftOpen.length > 0 && (
            <ul className="timeline space-y-2">
              {r.leftOpen.map((i) => (
                <Row
                  key={i.event.id}
                  tone="rounded-xl border border-warn/40 bg-warn-soft px-3"
                  time={localTime(i.openedAt, tz)}
                  badge={<Tile icon="alert" tone="bg-card text-warn" />}
                  title={<span className="text-warn">Gate left open {i.minutes} min</span>}
                  sub={
                    i.closedAt
                      ? `${i.deviceName ?? i.deviceId} · opened ${localTime(i.openedAt, tz)}, closed ${localTime(i.closedAt, tz)}`
                      : `${i.deviceName ?? i.deviceId} · still open`
                  }
                  tag={showSource && <SourceTag source={i.event.source} />}
                />
              ))}
            </ul>
          )}
          {r.night.length > 0 && (
            <div>
              <p className="px-0.5 pb-1 text-xs font-medium text-muted">Night activity · {r.night.length}</p>
              <List>
                {r.night.map((e) => (
                  <Row
                    key={e.id}
                    time={localTime(e.at, tz)}
                    badge={<Tile icon="moon" tone="bg-night-soft text-night" />}
                    title={`${KIND_META[e.kind].label} at night`}
                    sub={e.deviceName ?? e.deviceId}
                    tag={showSource && <SourceTag source={e.source} />}
                  />
                ))}
              </List>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

export function Visitors({ report: r, tz, showSource }: { report: GateReport } & Common) {
  return (
    <Section title="Visitors at the door" note="Person seen, then doorbell within 2 min" testId="report-visitors">
      {r.visitors.length ? (
        <List>
          {r.visitors.map((v) => (
            <Row
              key={v.events[1].id}
              time={localTime(v.arrivedAt, tz)}
              badge={<KindBadge kind="doorbell" />}
              title="Visitor rang the bell"
              sub={`${v.deviceName ?? v.deviceId} · rang ${v.waitSeconds}s after arriving`}
              tag={showSource && <SourceTag source={v.events[1].source} />}
            />
          ))}
        </List>
      ) : (
        <Muted>No visitors rang the bell.</Muted>
      )}
    </Section>
  );
}

/** Dense log: one line per event, two columns on wide screens and paper, incident and night rows marked. */
export function Timeline({ events, report: r, tz, showSource }: { events: GateEvent[]; report: GateReport } & Common) {
  const incident = new Set(r.leftOpen.map((i) => i.event.id));
  return (
    <Section title="Full timeline" note={`${events.length} events, oldest first`} testId="report-timeline">
      <ol className="timeline gap-x-10 md:columns-2 print:columns-2">
        {events.map((e) => {
          const night = isNightHour(localParts(e.at, tz).hour);
          const m = KIND_META[e.kind] ?? KIND_META.unknown;
          const flagged = incident.has(e.id);
          return (
            <li
              key={e.id}
              className={`flex break-inside-avoid items-center gap-2.5 border-b border-line py-1.5 text-sm ${flagged ? "bg-warn-soft" : ""}`}
            >
              <time className="w-11 shrink-0 font-mono tabular-nums text-muted">{localTime(e.at, tz)}</time>
              <span className={`grid size-6 shrink-0 place-items-center rounded-md ${m.tone}`}>
                <Icon name={m.icon} className="size-3.5" />
              </span>
              <span className={`shrink-0 font-medium ${flagged ? "text-warn" : ""}`}>{m.label}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted">{e.deviceName ?? e.deviceId}</span>
              {night && <Icon name="moon" className="size-3.5 shrink-0 text-night" />}
              {flagged && <Icon name="alert" className="size-3.5 shrink-0 text-warn" />}
              {showSource && <SourceTag source={e.source} />}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
