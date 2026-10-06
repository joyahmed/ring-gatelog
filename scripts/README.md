# scripts

## replay:day  (`bun scripts/replay-day.ts`)
Replays fixtures/gate-day.json to the webhook as one scripted gate day. No Ring token needed.
- `--day YYYY-MM-DD`  local day to fill (default today in GATE_TZ, default Asia/Dhaka)
- `--url URL`         webhook address (default http://localhost:3000/api/ring/webhook)
- `--dry-run`         print payloads and counts, send nothing
- `--fast`            no 150 ms pause between sends
Env: RING_WEBHOOK_SECRET signs each body (set it the same in the server); GATE_TZ sets the zone.
Every request carries `x-gatelog-replay: 1`, so the server stores these events as source "replay", never "webhook".
In production the webhook refuses unsigned calls unless GATELOG_ALLOW_UNSIGNED=1.
