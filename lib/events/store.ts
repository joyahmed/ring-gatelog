// Server-only event store: one JSONL file, one process. Uses node:fs, so it
// can never be bundled for the browser. Location: $GATELOG_DATA_DIR or ./data.

import fs from "node:fs";
import path from "node:path";
import type { GateEvent } from "./types";
import { DEFAULT_TZ, localDay } from "../report/time";

const dataDir = () => process.env.GATELOG_DATA_DIR || path.join(process.cwd(), "data");
const filePath = () => path.join(dataDir(), "events.jsonl");

function readAll(): GateEvent[] {
  let text: string;
  try {
    text = fs.readFileSync(filePath(), "utf8");
  } catch {
    return [];
  }
  const out: GateEvent[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as GateEvent);
    } catch {
      // A torn last line from a crash must not break the report.
    }
  }
  return out;
}

const byTime = (a: GateEvent, b: GateEvent) => Date.parse(a.at) - Date.parse(b.at);

/** Append events, skipping ids already stored (and duplicates within the batch). */
export function appendEvents(events: GateEvent[]): { added: number; skipped: number } {
  const seen = new Set(readAll().map((e) => e.id));
  const fresh = events.filter((e) => !seen.has(e.id) && seen.add(e.id));
  if (fresh.length) {
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.appendFileSync(filePath(), fresh.map((e) => JSON.stringify(e) + "\n").join(""));
  }
  return { added: fresh.length, skipped: events.length - fresh.length };
}

/** One local day's events, oldest first. */
export function readEvents({ day, tz = DEFAULT_TZ }: { day: string; tz?: string }): GateEvent[] {
  return readAll()
    .filter((e) => localDay(e.at, tz) === day)
    .sort(byTime);
}

/** Every local day that has at least one event, newest first. */
export function listDays(tz = DEFAULT_TZ): string[] {
  return [...new Set(readAll().map((e) => localDay(e.at, tz)))].sort().reverse();
}
