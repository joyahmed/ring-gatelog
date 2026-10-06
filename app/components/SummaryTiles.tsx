import type { GateReport } from "@/lib/report/build";
import { Icon, type IconName } from "./kinds";

export function SummaryTiles({ report: r }: { report: GateReport }) {
  const flags = r.leftOpen.length + r.night.length;
  const tiles: { label: string; value: number; icon: IconName; alert?: boolean }[] = [
    { label: "Events", value: r.total, icon: "motion" },
    { label: "People", value: r.totals.human, icon: "person" },
    { label: "Vehicles", value: r.vehicles.length, icon: "car" },
    { label: "Visitors", value: r.visitors.length, icon: "bell" },
    { label: "Gate opens", value: r.totals.gate_open, icon: "open" },
    { label: "Flags", value: flags, icon: "alert", alert: flags > 0 },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <li
          key={t.label}
          className={`card rounded-2xl border bg-card p-4 shadow-sm ${t.alert ? "border-warn/50" : "border-line"}`}
        >
          <div className={`flex items-center gap-1.5 text-xs font-medium ${t.alert ? "text-warn" : "text-muted"}`}>
            <Icon name={t.icon} className="size-3.5" /> {t.label}
          </div>
          <p className={`mt-1 text-3xl font-semibold tabular-nums tracking-tight ${t.alert ? "text-warn" : ""}`}>{t.value}</p>
        </li>
      ))}
    </ul>
  );
}

export function SummaryText({ lines }: { lines: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((l) => (
        <li key={l} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          {l}
        </li>
      ))}
    </ul>
  );
}
