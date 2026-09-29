# Friction log

One entry per snag: task, steps, expected vs actual, severity, workaround, suggestion.

(a teammate is drafting entries from the console session; merge them here.)

## Entry: Playground live-view video is black (2026-09-29)
- **Task:** watch the canned Package / Vehicle / Motion clips in Playground step 3.
- **Steps:** generate token, click a sim, wait. Repeated by two people, fresh token, fresh page load.
- **Expected:** a short video clip plays in the pane.
- **Actual:** first Package run played. Every later run (Motion, Vehicle, Motion again, Vehicle again) shows a black pane. POST creates the session (201 + SDP answer); closing it returns DELETE 503; POST /ring/console/api/metrics returns 503.
- **Severity:** high - the live-view sim is the only way to see any video without a device.
- **Workaround:** none found. Do not build a demo on sandbox video.
- **Suggestion:** show session/backend health in the console; make DELETE idempotent; add a static sample clip fallback.

## Entry: sandbox cannot produce gate-type events
- **Task:** get motion / vehicle / doorbell events from the simulated device history.
- **Actual:** `GET /v1/history/devices/{id}/events` returned 4 events; the first is `on_demand` (our own live-view run at the time of the test). No way found to make the sandbox emit `motion_detected`, `vehicle` or `button_press`.
- **Severity:** high for any event-driven app.
- **Suggestion:** add "emit test event" buttons to Playground, including a webhook delivery test.

- **Update (same night):** tried again in a private window; still black. `POST .../whep/sessions` returns 201 Created + SDP answer + Location header every time, so session setup works; only playback fails. Ruled out: expired token, leftover session, browser profile/extensions.
