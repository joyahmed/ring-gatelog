// GateLog demo video shot list (video-kit). Run the app in replay mode on :3100 first (see README "Run it").
// Selectors are the app's stable data-testids: report-verdict, report-summary, report-chart, report-flagged,
// report-visitors, report-timeline, print-button. Days: 2026-09-29 = 14 real Ring sandbox history events,
// 2026-10-06 = the scripted gate day replayed through the signed webhook (shown as "Demo data").
// Steps: see video-kit README. Captions: every caption stays on screen >= 4 s.

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
  steps: [
    // 1. Title + problem
    { do: 'card', kicker: 'Ring track · Build, Ship, Shape hackathon', title: 'GateLog - a daily gate report from Ring events',
      sub: 'Housing-society committees never know who came through the gate, when, or whether it was left open.', ms: 7000 },

    // 2. Real Ring API, early
    { do: 'card', kicker: 'Real Ring API response', title: 'GET /api/ring/status', titleSize: 64, codeTitle: 'GateLog server → Ring API GET /v1/devices',
      codeFrom: '/api/ring/status', codeSize: 26,
      foot: 'Device from the Ring API sandbox. Recorded once with a Playground token, replayed here (mode: replay).', ms: 1000 },
    { do: 'caption', text: 'A real Ring API response: the sandbox "Playground Device"', ms: 6000 },
    { do: 'wait', ms: 6500 },
    { do: 'goto', url: REAL, ms: 1500 },
    { do: 'caption', text: '29 Sep: 14 real live-view events from the Ring sandbox', ms: 5000 },
    { do: 'highlight', selector: '[data-testid="report-summary"]', ms: 5000 },
    { do: 'scroll', selector: '[data-testid="report-timeline"]', ms: 1500 },
    { do: 'caption', text: 'From GET /v1/history/devices/{id}/events - recorded once, replayed, not live', ms: 5500 },
    { do: 'highlight', selector: '[data-testid="report-timeline"]', ms: 5500 },

    // 3. How events arrive
    { do: 'card', kicker: 'How events arrive', title: 'A signed Ring webhook', titleSize: 72,
      lines: ['motion_detected - human, vehicle or motion', 'button_press - the doorbell',
        'contact_sensor_faulted / cleared - the gate sensor', 'Every request is checked: X-Signature, HMAC-SHA256 of the body'], ms: 500 },
    { do: 'caption', text: 'Ring pushes each event to POST /api/ring/webhook', ms: 5500 },
    { do: 'wait', ms: 6000 },
    { do: 'card', kicker: 'The sandbox has no gate events', title: 'So we replay a scripted gate day through the same signed webhook', titleSize: 50,
      codeTitle: 'terminal', code: REPLAY, codeSize: 26, typeMs: 140, foot: 'The report labels these events "Demo data" - never real gate traffic.', ms: 500 },
    { do: 'caption', text: 'Scripted gate day, same signed webhook, labelled "Demo data"', ms: 6500 },
    { do: 'wait', ms: 7000 },

    // 4. The demo day report
    { do: 'goto', url: DEMO, ms: 1000 },
    { do: 'caption', text: '6 Oct demo day: the report opens with the verdict', ms: 4500 },
    { do: 'highlight', selector: '[data-testid="report-verdict"]', ms: 4500 },
    { do: 'caption', text: 'The gate was left open 25 minutes, 15:10 to 15:35', ms: 4500 },
    { do: 'highlight', selector: '[data-testid="report-verdict"]', ms: 4500 },
    { do: 'caption', text: 'The day in six numbers', ms: 4000 },
    { do: 'highlight', selector: '[data-testid="report-summary"]', ms: 4000 },
    { do: 'scroll', selector: '[data-testid="report-chart"]', offset: 40, ms: 1200 },
    { do: 'caption', text: 'Hour by hour: night hours in grey, the gate-open strip below', ms: 5000 },
    { do: 'highlight', selector: '[data-testid="report-chart"]', ms: 5000 },
    { do: 'scroll', selector: '[data-testid="report-flagged"]', offset: 40, ms: 1200 },
    { do: 'caption', text: 'Flagged: gate open 10+ min, people or vehicles at night', ms: 4500 },
    { do: 'highlight', selector: '[data-testid="report-flagged"]', ms: 4500 },
    { do: 'caption', text: 'Visitors: a person seen, then the doorbell within 2 minutes', ms: 4500 },
    { do: 'highlight', selector: '[data-testid="report-visitors"]', ms: 4500 },
    { do: 'scroll', selector: '[data-testid="report-timeline"]', offset: 40, ms: 1200 },
    { do: 'caption', text: 'And every event, oldest first', ms: 4000 },
    { do: 'highlight', selector: '[data-testid="report-timeline"]', ms: 4000 },

    // 5. Phone + dark mode
    { do: 'device', url: DEMO, width: 390, height: 844, zoom: 0.79, label: 'Phone, 390 px wide', note: 'Read it at the gate or in the committee chat.', ms: 500 },
    { do: 'caption', text: 'Works at phone width', ms: 4500 },
    { do: 'wait', ms: 1500 },
    { do: 'scroll', frame: true, selector: '[data-testid="report-chart"]', offset: 16, dur: 1800, ms: 3000 },
    { do: 'media', colorScheme: 'dark', ms: 500 },
    { do: 'caption', text: 'Dark mode follows the phone', ms: 4500 },
    { do: 'scroll', frame: true, selector: '[data-testid="report-visitors"]', offset: 16, dur: 1800, ms: 5000 },

    // 6. Print view
    { do: 'media', colorScheme: 'light', media: 'print', ms: 300 },
    { do: 'device', url: DEMO, width: 794, height: 1123, zoom: 0.6, paper: true, label: 'Print view, A4',
      note: 'Light, no buttons, the whole day on one A4 page.', ms: 500 },
    { do: 'caption', text: 'One page for the committee meeting', ms: 5000 },
    { do: 'wait', ms: 5500 },
    { do: 'media', media: null, colorScheme: null, ms: 200 },

    // 7. Close
    { do: 'card', kicker: 'What it does not do', title: 'No lock control', titleSize: 80,
      sub: 'The Ring API has no lock or access-control endpoint. GateLog reads events and reports. It never opens or closes a gate.', ms: 500 },
    { do: 'caption', text: 'It reads events. It never controls the gate.', ms: 5000 },
    { do: 'wait', ms: 5500 },
    { do: 'card', kicker: 'Built on the Ring API', title: 'GateLog', titleSize: 110, sub: 'A daily gate report from Ring events.',
      lines: ['GET /v1/devices and /v1/history/devices/{id}/events', 'Signed Ring webhooks: motion, doorbell, contact sensor',
        'A daily report for the committee: verdict, flags, visitors, timeline'], ms: 7000 },
  ],
};
