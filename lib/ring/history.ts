// The sandbox ignores `event_types` (verified live 2026-10-06: every filter returned the same rows),
// so a filter's answer is never trusted blindly. These helpers hold the checks, pure and testable.
import type { GateEvent } from "../events/types";

const SUBTYPE_KINDS = new Set(["human", "vehicle", "other_motion"]);

/** Top-level history event type a filter asks for: "motion.human" -> "motion", "ding" -> "ding". */
export const topType = (eventTypes: string): string => eventTypes.split(".")[0];

/** Rows in a history body whose event_type is not the requested top-level type (filter ignored). */
export function countMismatched(body: unknown, eventTypes: string): number {
  const rows = (body as { data?: unknown })?.data;
  if (!Array.isArray(rows)) return 0;
  const want = topType(eventTypes);
  return rows.filter((r) => (r as { attributes?: { event_type?: unknown } })?.attributes?.event_type !== want).length;
}

/**
 * Ids that appear in more than one motion SUB-TYPE pass. Such a row was returned for e.g. both
 * motion.human and motion.vehicle, so the filter told us nothing: it must be kind "motion".
 */
export function ambiguousIds(passes: { kind: string; events: GateEvent[] }[]): Set<string> {
  const hits = new Map<string, number>();
  for (const p of passes) {
    if (!SUBTYPE_KINDS.has(p.kind)) continue;
    for (const key of new Set(p.events.map((e) => `${e.deviceId}|${e.id}`))) hits.set(key, (hits.get(key) ?? 0) + 1);
  }
  return new Set([...hits].filter(([, n]) => n > 1).map(([k]) => k));
}
