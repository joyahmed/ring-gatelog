# GateLog

Entry for the Ring track of [Build, Ship, Shape: Amazon Developer Hackathon](https://amazonappdev2026.devpost.com/).

**Idea:** an event log for a gate (housing society, office). Ring camera events (motion, package,
vehicle, doorbell press) become a daily report for the management committee: who came, when, what
was delivered. It reads events. It does not control locks, because the Ring API has no lock endpoint.

| | |
|---|---|
| Track | Ring (business systems / caretaking) |
| Deadline | Fri 23 Oct 2026 12:00 PDT = Sat 24 Oct 01:00 Dhaka. Internal wall: 21 Oct |
| Judging | Pass/fail viability, then 4 equal criteria. Friction log = up to +10% |
| Demo | Ring Playground simulator is allowed by the rules |
| Repo rule | Must call the Ring API at runtime. Public + licence, or private + shared with testing@devpost.com and 6 Amazon reviewers |

## Known facts (from Joy's console, 2026-09-29)

- Playground token: 30 min, scope `ava.v1:read` only. `GET api.amazonvision.com/v1/devices` returns 1 simulated device.
- Sandbox live-view sims: Package, Vehicle, Motion. `button_press` is in the docs but cannot be tested in the sandbox.
- No lock / access-control endpoint anywhere.
- Sandbox video: was black on most runs from about 15:30 to 16:15 UTC on 2026-09-29 (DELETE session and /metrics returned 503), reliable again from about 16:20 UTC - looks like a temporary Ring-side fault. Not a per-token rule. Credits (CC BY 4.0) if shown: Package = YouTube user frollard, Motion = Vimeo user Michael Black.
- Event History works in the sandbox (Joy, 2026-09-29): `GET /v1/history/devices/{id}/events` returned 4 `history-events` (each: attributes x4, relationships x2, meta x1). Event types inside not yet read.
- Real event types (console session): webhook `motion_detected` (sub_type motion/human/vehicle/other_motion), `button_press`, `contact_sensor_faulted/cleared`. History: `GET /v1/history/devices/{id}/events?event_types=ding,motion.vehicle`. There is NO package event in the API docs.
- Calls must be server-to-server (CORS blocks browsers).
- Real app tokens (access ~4h, refresh ~30d) need Create app: 4 HTTPS endpoints, privacy policy, ToS, ID verification. Skipped unless needed.
- Sample: github.com/AmazonAppDev/ring-api-helloworld (Next.js 15 + Python).

## Status

Scaffolded 2026-09-29. No code yet. Friction log is being kept in `docs/friction-log.md`.

The earlier AWS CDS idea was dropped (needs a registered company and a Facebook business profile). Plan kept in `docs/aws-cds-plan-ABANDONED.md`.
