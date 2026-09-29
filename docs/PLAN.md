# AWS CDS Agentic AI Hackathon — execution plan

Standalone checklist. Today is 2026-09-28. Written so Joy can act on it alone.

---

## BLOCKERS FIRST — none of them are code

1. **UNDOCUMENTED REQUIREMENT.** Every submission needs an **AWS Partner Central ACE
   Opportunity ID** (format `OXXXXXXXX`), campaign code
   `AWS CDS Agentic AI Hackathon -Sept. 2026`, status `Created` or beyond. Missing it =
   disqualified. Self-service: Partner Central → Sell → Opportunities → New.
   `medium confidence` — if the Opportunities tab is missing, ask in the hackathon Discord
   (discord.gg/558g3B5wS2) on **day 1**, not day 27.
2. **AWS account must be on a PAID plan.** Free Tier is refused: "Partner Registration
   requires a paid AWS account in good standing." No fee — usage-billed — but needs a
   working international card. **#1 Bangladesh-specific risk (card/forex decline). Test the
   card before anything else.**
3. **Company-domain email is mandatory.** gmail/hotmail/outlook/.edu rejected outright. $0
   options: Cloudflare Email Routing (forwards to Gmail) or Zoho Mail free tier (real
   mailbox — safer pick; `unverified` whether AWS blocks forward-only domains). If the
   domain is not owned yet, buy it — ~$10/yr, longest-lead item.

**DEADLINE: 28 Oct 2026 13:00 PDT = 29 Oct 2026 02:00 Dhaka. Treat 27 Oct as the wall.**

---

## THE OPPORTUNITY

AWS Communication Developer Services Agentic AI Hackathon. $40,000, 100% CASH, 4 winners:
1st $18,000, 2nd $8,000, 3rd $4,000, Best WhatsApp Implementation (Meta) $10,000. One prize
per project. Only **476 registered participants** (compare: Amazon's hackathon has 17,294).
Judging is a sponsor panel, NO community vote: Technical Execution 40%, Value 20%, Demo 20%,
Creativity 10%, Functionality 10%. Payout by electronic bank transfer or mailed cheque within
60 days of completed affidavit/tax forms — reaches Bangladesh. Bangladesh eligible (exclusion
list: Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea, Syria). Solo entry explicitly
allowed.

---

## PART 1 CHECKLIST — finish ALL of it before writing any code

- [ ] Verify the international card works
- [ ] Create a FRESH AWS account dedicated to ZettaByte (not the personal dev account —
      Partner Central provisions partner users into it and takes its billing address as HQ).
      New accounts get $200 Free Tier credits; `assumed` they survive the paid upgrade —
      confirm day 1.
- [ ] Upgrade to paid plan: console.aws.amazon.com/billing/home#/freetier/upgrade
- [ ] Company-domain email live and receiving
- [ ] IAM: attach `AWSPartnerCentralFullAccess` + `AWSMarketplaceSellerFullAccess` to
      yourself, or step 1 fails with "Access denied"
- [ ] Start at aws.amazon.com/partners/ → Become a partner → Console → AWS Partner Central →
      Get started (NOT the legacy partnercentral.awspartner.com self-register form)
- [ ] Identity verification: passport (safer than NID) + phone selfie via QR. <1 min,
      3 attempts per 24h.
- [ ] Business verification: legal name EXACTLY as registered with RJSC, country Bangladesh,
      Business Tax ID = **TIN** (NBR, 12-digit) as primary. Keep **BIN** (VAT) and trade
      licence / RJSC incorporation number ready — a supplementary form may ask for Tax ID or
      VAT + Business Registration Number + full registered address with postcode. Up to
      1 hour. A personal tax ID or unregistered sole proprietorship CANNOT pass.
- [ ] Registration form: alliance lead, job title, primary product/service, business email +
      emailed code. Accept **APN T&Cs AND ACE T&Cs** — the second is what enables the
      opportunity ID.
- [ ] Create the ACE opportunity with the campaign code above
- [ ] Claim the $50 AWS promo credits + Kiro code (first-come, they run out)
- [ ] Start Meta embedded signup so display-name review runs in background. Needs a phone
      number NOT currently on WhatsApp/WhatsApp Business (delete it there first) and a
      business website URL. AWS End User Messaging Social only supports WABAs billed in
      **USD** — set country/currency correctly or redo it.

**Latest safe start: 8 Oct.** The process is one day; the slack is for a bounced business
verification needing an APN support ticket (3-5 days).

**Rejection modes:** card declined (most likely), legal name mismatch vs RJSC, free-email
domain, "domain in use" (someone at ZettaByte already registered — migrate, don't
re-register), photo ID without a recent photo.

---

## PART 2 — the build

Mandatory: at least one of AWS End User Messaging SMS/RCS, AWS End User Messaging Social
(WhatsApp), or Amazon SES, used **at runtime** in the repo. Bedrock AgentCore recommended not
required — but Technical Execution is 40% and AgentCore is the sponsor's own primitive, so
use it. "Agentic" to these judges = the model PLANS and CALLS TOOLS to change state, not a
chatbot that answers questions.

### Channel costs — this decides the path

- SMS: **TRAP.** Needs origination identity — US toll-free $2/mo plus carrier verification,
  or BD alphanumeric sender ID requiring per-operator registration with GP/Robi/Teletalk
  under BTRC, **2-4 weeks**. Does not fit 31 days.
- RCS: **TRAP.** Same burden, narrower country support.
- SES: cheap but weak alone. The 3,000/mo free tier was **withdrawn for new customers on
  21 Jul 2026**; now $0.10/1,000 emails, so a demo costs fractions of a cent (sandbox sends
  free to verified addresses). Good as a secondary channel; a pure-SES entry will not win
  Technical Execution.
- **WhatsApp: CHEAPEST AND BEST.** AWS fee $0.005 out / $0.001 in. Since Meta's 1 Jul 2025
  per-message change, a customer-initiated message opens a 24h window where your non-template
  replies are FREE. **Full demo under $2.** No Meta Business Verification needed to send — an
  unverified WABA still does 250 business-initiated conversations/day.

### THE PROJECT

A WhatsApp-native agentic HR operations assistant for Bangladeshi SMEs — employees message
one WhatsApp number in Bangla or English, and a Bedrock AgentCore agent holding tools over the
existing NestJS/Prisma HRM schema actually executes leave requests, approvals, attendance
corrections and payslip delivery end to end, escalating to managers and archiving every action
by SES email.

- Ports rather than rewrites: existing Prisma models + leave/attendance/payroll services +
  RBAC become AgentCore tools behind a thin NestJS adapter. The agent calls the existing
  `@ROLES()`-guarded service layer, so authorization is already solved — roughly one new
  module, not an app.
- Highest-scoring demo element: the manager approval loop over WhatsApp interactive buttons —
  agent pauses, waits for a human decision, resumes.
- Both services cheaply: WhatsApp in/out via End User Messaging Social (SNS event destination
  → webhook), SES for payslip PDF + immutable audit trail. Demo spend <$5 of the $50 credits.
- Value story (20%): BD SMEs whose staff have no laptop and no HRM login — WhatsApp IS the
  client. Say the number out loud in the video.
- Keepable: ships as a paid WhatsApp module to existing HRM clients the day after judging;
  same tool-adapter pattern drops onto the society-management app (dues reminders,
  complaints) with the schema swapped.

---

## DAY PLAN (start 1 Oct, 8-10 working days)

- [ ] D0 (29-30 Sep): all of Part 1.
- [ ] D1: WABA live, WhatsApp message end to end, SNS→webhook proven, SES identity verified.
- [ ] D2: AgentCore skeleton + 2 tools (getLeaveBalance, applyForLeave) against a seeded copy
      of the HRM Prisma DB.
- [ ] D3-D4: full tool set + manager approval loop over interactive buttons; Bangla/English
      handling.
- [ ] D5: SES payslip + audit trail; error/edge handling; idempotent webhook.
- [ ] D6: deploy (Lambda/App Runner), architecture diagram, public GitHub repo with README +
      licence.
- [ ] D7: record and cut the ~3-minute video. Judges stop at 3:00 — working WhatsApp thread
      on screen in the first 20 seconds, no music you do not own.
- [ ] D8: Devpost writeup, paste the ACE Opportunity ID, deployed URL or run instructions.
      **Submit 27 Oct.**
- [ ] D9-D10: buffer only.

---

## THE ONE RISK

Most likely failure: treating APN registration as paperwork for later, and on ~25 Oct the
paid-plan card upgrade or the business verification bounces — or discovering the ACE
Opportunity ID requirement with two days left. It is an ACCOUNT risk, not a coding risk, and
there is no fast path once it fails.

De-risk: finish Part 1 end to end before 1 Oct, before a single line of code.

---

## SOURCES

aws-cds-partner.devpost.com + /rules + /details/faq; docs.aws.amazon.com/partner-central/latest/getting-started/
(registering, verification-process, registration-faq, registration-form);
docs.aws.amazon.com/social-messaging/latest/userguide/getting-started-whatsapp.html;
aws.amazon.com/end-user-messaging/pricing/; developers.facebook.com/docs/whatsapp/pricing;
aws.amazon.com/ses/pricing/
