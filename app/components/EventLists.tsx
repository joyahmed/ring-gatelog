import type { GateEvent } from "@/lib/events/types";
import type { GateReport } from "@/lib/report/build";
import { isNightHour } from "@/lib/report/build";
import { localParts, localTime } from "@/lib/report/time";
import { Icon, KIND_META, KindBadge, SourceTag } from "./kinds";
import { Muted, Section } from "./Section";

type Tz = { tz: string };

function Row({ time, badge, title, sub, tag, tone = "" }: { time: string; badge: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; tag?: React.ReactNode; tone?: string }) {
  return (
    <li className={`flex items-center gap-3 py-2.5 ${tone}`}>
      <time className="w-11 shrink-0 font-mono text-sm tabular-nums text-muted">{time}</time>
      {badge}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {sub && <p className="truncate text-xs text-muted">{sub}</p>}
      </div>
      {tag}
    </li>
  );
}

const List = ({ children }: { children: React.ReactNode }) => <ul className="timeline divide-y divide-line">{children}</ul>;

export function Flagged({ report: r, tz }: { report: GateReport } & Tz) {
  const flags = [
    ...r.leftOpen.map((i) => ({
      key: `open-${i.event.id}`,
      at: i.openedAt,
      icon: "alert" as const,
      tone: "bg-warn-soft text-warn",
      title: `Gate left open ${i.minutes} min`,
      sub: i.closedAt ? `${i.deviceName ?? i.deviceId} · closed at ${localTime(i.closedAt, tz)}` : `${i.deviceName ?? i.deviceId} · still open`,
      source: i.event.source,
    })),
    ...r.night.map((e) => ({
      key: `night-${e.id}`,
      at: e.at,
      icon: "moon" as const,
      tone: "bg-night-soft text-night",
      title: `${KIND_META[e.kind].label} at night`,
      sub: e.deviceName ?? e.deviceId,
      source: e.source,
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return (
    <Section title="Flagged" note="Gate open 10+ min · people or vehicles 22:00-06:00">
      {flags.length ? (
        <List>
          {flags.map((f) => (
            <Row
              key={f.key}
              time={localTime(f.at, tz)}
              badge={
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${f.tone}`}>
                  <Icon name={f.icon} />
                </span>
              }
              title={f.title}
              sub={f.sub}
              tag={<SourceTag source={f.source} />}
            />
          ))}
        </List>
      ) : (
        <Muted>Nothing flagged. The gate was never left open and there was no night activity.</Muted>
      )}
    </Section>
  );
}

export function Visitors({ report: r, tz }: { report: GateReport } & Tz) {
  return (
    <Section title="Visitors at the door" note="Person seen, then doorbell within 2 min">
      {r.visitors.length ? (
        <List>
          {r.visitors.map((v) => (
            <Row
              key={v.events[1].id}
              time={localTime(v.arrivedAt, tz)}
              badge={<KindBadge kind="doorbell" />}
              title="Visitor rang the bell"
              sub={`${v.deviceName ?? v.deviceId} · rang ${v.waitSeconds}s after arriving`}
              tag={<SourceTag source={v.events[1].source} />}
            />
          ))}
        </List>
      ) : (
        <Muted>No visitors rang the bell.</Muted>
      )}
    </Section>
  );
}

export function Timeline({ events, tz }: { events: GateEvent[] } & Tz) {
  return (
    <Section title="Full timeline" note={`${events.length} events, oldest first`}>
      <List>
        {events.map((e) => {
          const night = isNightHour(localParts(e.at, tz).hour);
          return (
            <Row
              key={e.id}
              time={localTime(e.at, tz)}
              badge={<KindBadge kind={e.kind} />}
              title={KIND_META[e.kind]?.label ?? e.kind}
              sub={e.deviceName ?? e.deviceId}
              tag={
                <span className="flex shrink-0 items-center gap-1.5">
                  {night && <Icon name="moon" className="size-3.5 text-night" />}
                  <SourceTag source={e.source} />
                </span>
              }
            />
          );
        })}
      </List>
    </Section>
  );
}
