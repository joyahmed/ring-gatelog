import type { ReactNode } from "react";

export function Section({
  title,
  note,
  className = "",
  children,
}: {
  title: string;
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5 ${className}`}>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {note && <p className="text-xs text-muted">{note}</p>}
      </header>
      {children}
    </section>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted">{children}</p>;
}
