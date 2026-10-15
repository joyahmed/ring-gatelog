// GateLog demo video shot list (video-kit). Run the app in replay mode on :3100 first (see README "Run it").
// Selectors are the app's stable data-testids: report-verdict, report-summary, report-chart, report-flagged,
// report-visitors, report-timeline, print-button. Days: 2026-09-29 = 14 real Ring sandbox history events,
// 2026-10-06 = the scripted gate day replayed through the signed webhook (shown as "Demo data").
// Steps: see video-kit README. Scenes are pinned with `at` (seconds) to Joy's recorded voice-over (ring-final-edit.m4a,
// 1:54); the captions are the voice's own .srt, so the shot list has no caption steps.

const DEMO = '/?day=2026-10-06';
const REAL = '/?day=2026-09-29';

// Real output of the replay command (captured 2026-10-06 against this server).
const REPLAY = `$ RING_WEBHOOK_SECRET=… bun run replay:day -- --day 2026-10-06 \\
    --url http://localhost:3100/api/ring/webhook
day 2026-10-06 tz Asia/Dhaka: 46 payloads, sent 46 ok, 0 failed, signed
  button_press                 6
  contact_sensor_cleared       4
  contact_sensor_faulted       4
  motion.human                 11
  motion.motion                3
  motion.other_motion          2
  motion.vehicle               16`;

export default {
  viewport: { width: 1920, height: 1080 },
  scale: 1.3333, // page lays out at 1440x810 CSS px, captured sharp at 1920x1080
  // Own look, not video-kit's default teal: a warm gate light glowing on night slate. Record with --captions off
  // (the voice-over tells the story; the caption box covered the report). The .srt comes from the voice-over.
  bg: 'radial-gradient(1100px 680px at 18% 8%,#7c4a12 0%,#2a1d14 38%,#0c1117 72%)',
  accent: '#fbbf24',
  steps: [
    // 1. Title + problem (voice 0:00 "Hi, I'm Joy" .. 0:12 "So I built GateLog")
    { do: 'card', kicker: 'Ring track · Build, Ship, Shape hackathon', title: 'GateLog - a daily gate report from Ring events',
      sub: 'The guard keeps a paper register. The committee never really sees who came through the gate, or when.', ms: 500 },

    // 2. Real Ring API, early (0:13 "GateLog talks to the Ring API" .. 0:34)
    { at: 13.2, do: 'card', kicker: 'Real Ring API response', title: 'GET /api/ring/status', titleSize: 64, codeTitle: 'GateLog server → Ring API GET /v1/devices',
      codeFrom: '/api/ring/status', codeSize: 26,
      foot: 'Device from the Ring API sandbox. Recorded once with a Playground token, replayed here (mode: replay).', ms: 500 },
    { at: 22.6, do: 'goto', url: REAL, ms: 500 },                                     // 0:23 "14 real events"
    { at: 23.4, do: 'highlight', selector: '[data-testid="report-summary"]', keep: true, ms: 300 },
    { at: 28.4, do: 'scroll', selector: '[data-testid="report-timeline"]', ms: 1500 }, // 0:29 "I saved these answers once"
    { at: 30.0, do: 'highlight', selector: '[data-testid="report-timeline"]', keep: true, ms: 300 },

    // 3. How events arrive (0:35 "In real life, Ring sends every event" .. 0:54)
    { at: 34.4, do: 'card', kicker: 'How events arrive', title: 'A signed Ring webhook', titleSize: 72,
      lines: ['motion_detected - human, vehicle or motion', 'button_press - the doorbell',
        'contact_sensor_faulted / cleared - the gate sensor', 'Every request is checked: X-Signature, HMAC-SHA256 of the body'], ms: 500 },
    { at: 45.5, do: 'card', kicker: 'The sandbox has no gate events', title: 'So we replay a scripted gate day through the same signed webhook', titleSize: 50,
      codeTitle: 'terminal', code: REPLAY, codeSize: 26, typeMs: 140, foot: 'The report labels these events "Demo data" - never real gate traffic.', ms: 500 },

    // 4. The demo day report (0:54 "Here is that day" .. 1:29)
    { at: 53.7, do: 'goto', url: DEMO, ms: 500 },
    { at: 54.2, do: 'highlight', selector: '[data-testid="report-verdict"]', keep: true, ms: 300 },  // verdict, 25 min, safety net
    { at: 69.9, do: 'highlight', selector: '[data-testid="report-summary"]', keep: true, ms: 300 },  // 1:10 "six numbers"
    { at: 73.4, do: 'scroll', selector: '[data-testid="report-chart"]', offset: 40, ms: 1200 },
    { at: 74.4, do: 'highlight', selector: '[data-testid="report-chart"]', keep: true, ms: 300 },    // 1:14 "Hour by hour"
    { at: 79.0, do: 'scroll', selector: '[data-testid="report-flagged"]', offset: 40, ms: 1000 },
    { at: 80.0, do: 'highlight', selector: '[data-testid="report-flagged"]', keep: true, ms: 300 },  // 1:20 "Anything unusual"
    { at: 82.5, do: 'highlight', selector: '[data-testid="report-visitors"]', keep: true, ms: 300 }, // 1:22 "Then visitors"
    { at: 85.7, do: 'scroll', selector: '[data-testid="report-timeline"]', offset: 40, ms: 1000 },
    { at: 86.7, do: 'highlight', selector: '[data-testid="report-timeline"]', keep: true, ms: 300 }, // 1:27 "every event in order"

    // 5. Guard's phone + night shift (1:30 "Our guard can check it on the phone" .. 1:37)
    { at: 89.3, do: 'device', url: DEMO, width: 390, height: 844, zoom: 0.79, label: 'Phone, 390 px wide', note: 'The guard checks it right at the gate.', ms: 500 },
    { at: 91.2, do: 'scroll', frame: true, selector: '[data-testid="report-chart"]', offset: 16, dur: 1800, ms: 2000 },
    { at: 94.4, do: 'media', colorScheme: 'dark', ms: 300 },                           // 1:35 "it works in dark mode too"
    { at: 95.0, do: 'scroll', frame: true, selector: '[data-testid="report-visitors"]', offset: 16, dur: 1800, ms: 2000 },

    // 6. Print view (1:38 "It prints on one page" .. 1:42)
    { at: 97.6, do: 'media', colorScheme: 'light', media: 'print', ms: 300 },
    { do: 'device', url: DEMO, width: 794, height: 1123, zoom: 0.6, paper: true, label: 'Print view, A4',
      note: 'Light, no buttons, the whole day on one A4 page.', ms: 500 },

    // 7. Close (1:43 "GateLog only reads events" .. 1:54 "Thank you for watching")
    { at: 102.5, do: 'media', media: null, colorScheme: null, ms: 200 },
    { do: 'card', kicker: 'What it does not do', title: 'No lock control', titleSize: 80,
      sub: 'The Ring API has no lock or access-control endpoint. GateLog reads events and reports. It never opens or closes a gate.', ms: 500 },
    { at: 107.0, do: 'card', kicker: 'Built on the Ring API', title: 'GateLog', titleSize: 110, sub: 'A daily gate report from Ring events.',
      lines: ['GET /v1/devices and /v1/history/devices/{id}/events', 'Signed Ring webhooks: motion, doorbell, contact sensor',
        'A daily report for the committee: verdict, flags, visitors, timeline'], ms: 500 },
    { at: 115.0, do: 'wait', ms: 100 },
  ],
};
