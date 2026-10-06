// Local-time helpers. Everything is stored in UTC; the gate lives in one tz.

export const DEFAULT_TZ = "Asia/Dhaka";

const partsCache = new Map<string, Intl.DateTimeFormat>();

function fmt(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    partsCache.set(tz, f);
  }
  return f;
}

export interface LocalParts {
  day: string; // YYYY-MM-DD
  hour: number; // 0-23
  minute: number;
}

export function localParts(at: string | Date, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const { type, value } of fmt(tz).formatToParts(new Date(at))) p[type] = value;
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  };
}

export const localDay = (at: string | Date, tz: string) => localParts(at, tz).day;

/** "HH:MM" in local time. */
export function localTime(at: string | Date, tz: string): string {
  const { hour, minute } = localParts(at, tz);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Shift a YYYY-MM-DD string by n days (calendar math, tz-free). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const isDay = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
