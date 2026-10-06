import { createHash } from "node:crypto";
import type { GateEvent, GateEventKind, GateEventSource } from "../events/types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

/** Epoch seconds or ms (or ISO string) -> ISO UTC. null if unusable. */
export function toIso(v: unknown): string | null {
  let ms: number;
  if (typeof v === "number" && Number.isFinite(v)) {
    ms = Math.abs(v) < 1e11 ? v * 1000 : v; // 1e11 ms = 1973; 1e11 s = year 5138
  } else if (typeof v === "string" && v.trim()) {
    ms = /^\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : Date.parse(v);
    if (/^\d+(\.\d+)?$/.test(v.trim()) && Math.abs(ms) < 1e11) ms *= 1000;
  } else return null;
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function hashId(deviceId: string, kind: string, at: string): string {
  return createHash("sha256").update(`${deviceId}|${kind}|${at}`).digest("hex").slice(0, 24);
}

const MOTION_KINDS = new Set<GateEventKind>(["motion", "human", "vehicle", "other_motion"]);

function webhookKind(type: string, subType: unknown): GateEventKind {
  switch (type) {
    case "motion_detected": {
      const s = typeof subType === "string" ? subType : "motion";
      return MOTION_KINDS.has(s as GateEventKind) ? (s as GateEventKind) : s === "" ? "motion" : "unknown";
    }
    case "button_press":
      return "doorbell";
    case "contact_sensor_faulted":
      return "gate_open";
    case "contact_sensor_cleared":
      return "gate_closed";
    default:
      return "unknown";
  }
}

/** Ring webhook v1.1 payload ({meta, data}; bare `data` also accepted) -> GateEvent, or null if unusable. */
export function normalizeWebhook(payload: unknown, source: GateEventSource = "webhook"): GateEvent | null {
  if (!isObj(payload)) return null;
  const data = isObj(payload.data) ? payload.data : payload;
  const type = str(data.type);
  const attrs = isObj(data.attributes) ? data.attributes : null;
  if (!type || !attrs) return null;

  let deviceId = str(attrs.source);
  if (!deviceId && isObj(data.relationships) && isObj(data.relationships.devices)) {
    const self = isObj(data.relationships.devices.links) ? str(data.relationships.devices.links.self) : undefined;
    deviceId = self?.split("/").filter(Boolean).pop();
  }
  if (!deviceId) return null;

  const at = toIso(attrs.timestamp) ?? (isObj(payload.meta) ? toIso(payload.meta.time) : null);
  if (!at) return null;

  const kind = webhookKind(type, attrs.sub_type);
  return {
    id: str(data.id) ?? hashId(deviceId, kind, at),
    deviceId,
    kind,
    at,
    source,
    raw: payload,
  };
}

/** Ring history-events body (JSON:API) -> GateEvents. `opts.kind` overrides plain `motion` rows only. `opts.eventType` drops rows of any other event_type. */
export function normalizeHistory(
  body: unknown,
  opts: { deviceId: string; deviceName?: string; kind?: GateEventKind; eventType?: string },
): GateEvent[] {
  const rows = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.data) ? body.data : [];
  const out: GateEvent[] = [];
  for (const row of rows) {
    if (!isObj(row) || !isObj(row.attributes)) continue;
    const a = row.attributes;
    if (opts.eventType && a.event_type !== opts.eventType) continue;
    const at = toIso(a.start);
    if (!at) continue;
    let deviceId = opts.deviceId;
    const src = isObj(row.relationships) && isObj(row.relationships.source) && isObj(row.relationships.source.data)
      ? str(row.relationships.source.data.id) : undefined;
    if (src) deviceId = src;
    let kind: GateEventKind;
    switch (a.event_type) {
      case "motion":
        kind = opts.kind && MOTION_KINDS.has(opts.kind) ? opts.kind : "motion";
        break;
      case "on_demand": kind = "live_view"; break;
      case "ding": kind = "doorbell"; break;
      default: kind = "unknown";
    }
    const ev: GateEvent = {
      id: str(row.id) ?? hashId(deviceId, kind, at),
      deviceId,
      kind,
      at,
      source: "history",
      raw: row,
    };
    if (opts.deviceName) ev.deviceName = opts.deviceName;
    out.push(ev);
  }
  return out;
}
