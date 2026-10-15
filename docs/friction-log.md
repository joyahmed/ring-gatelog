# Friction log

One entry per snag: task, steps, expected vs actual, severity, workaround, suggestion.

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

- **Another possible cause (Joy):** a teammate reloaded the browser, and video worked after that. Against it: the teammate's earlier fresh page load and Joy's private-window test both stayed black. So the cause is still unknown. Candidates: temporary Ring backend fault, or stale page state that only some reloads clear. To be safe when recording: reload the console, fresh token, one clip per take.

## 2026-10-06 - building against the docs and the official sample

- **Sample webhook code does not match the docs.** `AmazonAppDev/ring-api-helloworld` does not check `X-Signature` (only an optional Bearer secret), and its payload schema has fields the docs never mention (`confidence`, `bounding_box`, `thumbnail_url`, `person_detected`). It would also reject `button_press` and the contact-sensor events. Severity high for anyone copying it: unsigned webhooks get accepted, valid ones get rejected. Suggestion: verify the HMAC in the sample and generate its schema from the docs.
- **History rows do not say what kind of motion it was.** `GET /v1/history/devices/{id}/events` returns `event_type: "motion"` even when filtered with `event_types=motion.human`. To tell people from vehicles you must make one call per sub-type and remember which call each row came from. Suggestion: return the sub-type on the row, as the webhook already does.
- **History has no time-range filter.** Only `event_types` and `page[key]`. A daily report has to page backwards until it passes the day. Suggestion: `since` / `until` params.
- **The sample says there is no polling API for events; the docs have one (history).** Confusing for a first read.
- **Next-page links may drop the filter.** The docs' `links.next` example carries only `page[key]`, not `event_types`. If real responses do the same, page 2 comes back unfiltered. We now re-add the filter ourselves. Unverified against a live multi-page response.
- **Sandbox ignores event_types (every filter returns the same rows).** Live run 2026-10-06: `motion.human`, `motion.vehicle`, `motion.other_motion`, `motion`, `ding` and `on_demand` all returned the same 14 rows, all `event_type: "on_demand"`, no `links.next`. The documented filter does nothing, so a client cannot trust it and cannot get sub-types from it. Suggestion: honour the filter, or document that the sandbox does not.
- **Confirmed: history rows have 2 relationships (source, cv_detections) and meta {riid}, docs show 1 and no meta.** Checked on the live Playground Device 2026-10-06 (replaces the earlier "unverified which is current"). `cv_detections` is `{"data": []}` on every row and is not documented. Suggestion: document it and update the example response.
