// Shot list. Selectors are the app's stable data-testids: report-verdict, report-summary, report-chart,
// report-flagged, report-visitors, report-timeline, print-button. Open /?day=2026-10-06 for the demo day.
// Steps: goto{url} wait{ms} click{selector} hover{selector} type{selector,text} scroll{y|selector}
//        highlight{selector,keep?} caption{text,ms}. Every step takes optional ms (min time spent on it).
export default {
  viewport: { width: 1920, height: 1080 },
  steps: [
    { do: 'goto', url: '/?day=2026-10-06', ms: 3000 },
    { do: 'caption', text: 'Every Ring event at the gate, as a daily report for the committee', ms: 6000 },
    { do: 'wait', ms: 6500 },
    { do: 'highlight', selector: '[data-testid="report-summary"]', ms: 3000 },
    { do: 'scroll', selector: '[data-testid="report-chart"]', ms: 3000 },
    { do: 'caption', text: 'Arrivals and departures, hour by hour', ms: 4000 },
    { do: 'highlight', selector: '[data-testid="report-chart"]', ms: 4500 },
    { do: 'scroll', selector: '[data-testid="report-flagged"]', ms: 2500 },
    { do: 'highlight', selector: '[data-testid="report-flagged"]', ms: 3500 },
    { do: 'scroll', selector: '[data-testid="report-visitors"]', ms: 3000 },
    { do: 'caption', text: 'Visitors and deliveries, nothing missed', ms: 4000 },
    { do: 'wait', ms: 4500 },
    { do: 'click', selector: '[data-testid="print-button"]', ms: 3500 },
    { do: 'caption', text: 'One click to a print-ready page for the meeting', ms: 4000 },
    { do: 'wait', ms: 5000 },
  ],
};
