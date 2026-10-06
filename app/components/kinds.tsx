import type { GateEventKind, GateEventSource } from "@/lib/events/types";

// One table drives every label, icon and colour for an event kind.
const ICONS: Record<string, string> = {
  person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  car: "M5 16h14M6.5 16l-1.5 3M17.5 16l1.5 3M4 13l2-5.5A2 2 0 0 1 7.9 6h8.2a2 2 0 0 1 1.9 1.5L20 13v3H4v-3Zm3.5 0h.01M16.5 13h.01",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0",
  open: "M4 20h16M6 20V5l8-1v16M14 6h4v14M11 12h.01",
  closed: "M4 20h16M6 20V4h12v16M14 12h.01",
  motion: "M3 12h4l3-7 4 14 3-7h4",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  unknown: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14m0 3h.01",
  alert: "M12 4 2.5 20h19L12 4Zm0 6v4m0 3h.01",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2",
  printer: "M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7v-7Z",
  chevronL: "M15 6l-6 6 6 6",
  chevronR: "M9 6l6 6-6 6",
};
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}

export const KIND_META: Record<GateEventKind, { label: string; icon: IconName; tone: string }> = {
  human: { label: "Person", icon: "person", tone: "bg-accent-soft text-accent" },
  vehicle: { label: "Vehicle", icon: "car", tone: "bg-accent-soft text-accent" },
  doorbell: { label: "Doorbell press", icon: "bell", tone: "bg-accent-soft text-accent" },
  gate_open: { label: "Gate opened", icon: "open", tone: "bg-warn-soft text-warn" },
  gate_closed: { label: "Gate closed", icon: "closed", tone: "bg-line/60 text-muted" },
  motion: { label: "Motion", icon: "motion", tone: "bg-line/60 text-muted" },
  other_motion: { label: "Other motion", icon: "motion", tone: "bg-line/60 text-muted" },
  live_view: { label: "Live view", icon: "eye", tone: "bg-line/60 text-muted" },
  unknown: { label: "Unknown event", icon: "unknown", tone: "bg-line/60 text-muted" },
};

export function SourceTag({ source }: { source: GateEventSource }) {
  return (
    <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
      {source}
    </span>
  );
}

export function KindBadge({ kind }: { kind: GateEventKind }) {
  const m = KIND_META[kind] ?? KIND_META.unknown;
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${m.tone}`} title={m.label}>
      <Icon name={m.icon} />
    </span>
  );
}
