// Which history event types GateLog queries, and which GateEvent kind each one means.
// History rows only say "motion", so the kind comes from the event_types we asked for.
// Order matters: specific subtypes first, bare "motion" last, so sync dedupe keeps the specific kind.
import type { GateEventKind } from "../events/types";

export const HISTORY_TYPES: { eventTypes: string; kind: GateEventKind }[] = [
  { eventTypes: "motion.human", kind: "human" },
  { eventTypes: "motion.vehicle", kind: "vehicle" },
  { eventTypes: "motion.other_motion", kind: "other_motion" },
  { eventTypes: "ding", kind: "doorbell" },
  { eventTypes: "on_demand", kind: "live_view" },
  { eventTypes: "motion", kind: "motion" },
];

export const MAX_PAGES = 5;

/** Split a Ring `links.next` ("/v1/...?page[key]=...") into path + query for ringGet. `base` (e.g. event_types) is kept: Ring's next link may drop it. */
export function splitNext(next: string, base: Record<string, string> = {}): { path: string; query: Record<string, string> } {
  const u = new URL(next, "http://x");
  const query: Record<string, string> = {};
  u.searchParams.forEach((v, k) => (query[k] = v));
  return { path: u.pathname, query: { ...base, ...query } };
}
