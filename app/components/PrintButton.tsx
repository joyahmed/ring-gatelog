"use client";

import { Icon } from "./kinds";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-card px-3 text-sm text-fg hover:border-accent hover:text-accent"
    >
      <Icon name="printer" /> Print
    </button>
  );
}
