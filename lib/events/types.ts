// The one event shape the whole app works with. Ring webhook payloads, Ring
// event-history records and replayed demo events are all normalized into this.

export type GateEventKind =
  | "motion" // motion_detected, sub_type motion
  | "human" // motion_detected, sub_type human
  | "vehicle" // motion_detected, sub_type vehicle
  | "other_motion" // motion_detected, sub_type other_motion
  | "doorbell" // button_press / history "ding"
  | "gate_open" // contact_sensor_faulted
  | "gate_closed" // contact_sensor_cleared
  | "live_view" // on-demand live view (history "on_demand")
  | "unknown";

export type GateEventSource = "webhook" | "history" | "replay";

export interface GateEvent {
  /** Stable id: Ring's event id when it has one, else a hash of device+kind+time. */
  id: string;
  deviceId: string;
  deviceName?: string;
  kind: GateEventKind;
  /** ISO 8601, UTC. */
  at: string;
  source: GateEventSource;
  /** The original payload, kept for the audit trail. */
  raw?: unknown;
}
