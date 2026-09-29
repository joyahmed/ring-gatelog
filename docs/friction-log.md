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

- **Update 16:20 UTC:** Package sim played video (frame shows "Thief stealing our package", 2026/09/29 16:20:39 UTC overlay). So playback is INTERMITTENT, not dead. Pattern so far: Package has played twice; Motion and Vehicle have only ever been black. Unverified whether it is per-clip or random. Clip credit shown in console: "Thief stealing our package" by YouTube user frollard, CC BY 4.0 - attribute it if it appears in our video.

- **Hypothesis (Joy):** video plays only ONCE per token. Fits the data: the first run after a fresh token played (Package, twice on two tokens); later runs on the same token were black. To test: fresh token -> run Vehicle FIRST. If it plays, the rule is "first play per token", not "Package only".

- **CONFIRMED (Joy, fresh token, Vehicle first):** Vehicle played. So it is not Package-only. Working rule: **the first live-view sim after a new token plays; later ones on the same token are black.** Not seen in any docs. Severity medium: silent failure, no error in the UI. Suggestion: return an error or a message when a token has used its one playback, or lift the limit.

- **Third confirmation (Joy, fresh token, Motion first):** Motion played ("Birds on Feeders" by Vimeo user Michael Black, CC BY 4.0 - credit if shown). All three clips play as the first sim on a fresh token: Package, Vehicle, Motion. Rule holds: **one playable live-view per token.**

- **CORRECTION (Joy, ~16:30 UTC):** Package, then Vehicle, then Motion all played again, several runs in a row. So "one playable video per token" is WRONG. The black screens were earlier and are unexplained; best guess is a temporary Ring backend fault (the 503s on DELETE and /metrics point that way). Unverified. Playback has been reliable from about 16:20 UTC on.
