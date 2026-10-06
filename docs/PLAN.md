# GateLog build plan (Gate 2, due ~10 Oct 2026)

Goal of Gate 2: one full loop works. Ring event -> our code -> daily gate report on screen.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind v4, run with **bun** (new project rule).
- No database. Events live in `data/events.jsonl` (gitignored). One file is enough for one gate.
- Look: teal + slate + Inter, light and dark, prints cleanly on A4 for the committee.

## Pieces and who owns which files
| Piece | Files | What it does |
|---|---|---|
| Event type | `lib/events/types.ts` | The one normalized `GateEvent` shape. Fixed; change only on purpose. |
| Store | `lib/events/store.ts` | Append events, dedupe by id, read by local day. |
| Report | `lib/report/*` | Pure function: events of a day -> report (counts, hourly chart, visitors, vehicles, gate-left-open, night activity). |
| UI | `app/page.tsx`, `app/components/*` | Report for a chosen date, live API status, print view. |
| Ring client | `lib/ring/*` | Server-only calls to the Ring API. Modes: `live`, `record` (live + save responses), `replay` (saved responses, no token). |
| Webhook | `app/api/ring/webhook/route.ts` | Takes Ring webhook v1.1 payloads, normalizes, stores. |
| Sync | `app/api/ring/sync/route.ts` | Pulls `/v1/history/devices/{id}/events` into the store. |
| Demo day | `fixtures/gate-day.json`, `scripts/replay-day.ts` | A scripted gate day sent to the webhook, shifted to today. Needed because the sandbox has no gate events. |

## Report rules (honest, no invented data)
- Visitor = human motion followed by a doorbell press within 2 minutes.
- Vehicle in = vehicle motion.
- Gate left open = gate_open with no gate_closed for 10+ minutes.
- Night activity = any human/vehicle event 22:00-06:00 local.
- There is NO package event in the Ring API, so the report never claims "delivery". It can say "visitor at the door".
- Every event in the report keeps its source (webhook / history / replay) visible.

## Gates
- Code: `bun test` green, `bun run build` green, numbers quoted.
- Screen: screenshots of the report, light + dark, 390px + 1440px.
- Live: one real Playground call (needs Joy's 30-min token; `RING_TOKEN` in `.env.local`, never committed).
