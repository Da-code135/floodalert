# FloodAlert — 3-minute demo runbook

Use this with your private local pitch deck. The app is intentionally product-only.

## Before you walk on stage

1. `npm run dev` (or `npm run build && npm start`).
2. Open <http://localhost:3000> at 1440×900 or wider.
3. Click **Reset demo data** in the footer.
4. Optional: set `GEMINI_API_KEY` to show real multimodal triage. Without it, the edge fallback is still a complete demo; say so plainly.
5. Open your private pitch deck in presenter view or on a second screen. Keep your private one-pager ready for Q&A.

## The 3-minute story

### 0:00–0:25 — The 20-minute window

> "At 3pm in Bwaise, the rain starts. Twenty minutes later the water is above the boda stage. Amina, a market vendor, doesn't have a smartphone. She finds out when the water reaches her stall."

Point at the hero risk gauge and the live report feed. Name the SDG: **11.5**.

### 0:25–0:50 — The loop

> "FloodAlert turns the people who see water first into the sensor network: a 20-second report, Gemini triage, a human verification step, and a bilingual alert to the circles that need it."

Open `/report`, but do not submit yet. Point at the three-step form, the edge-fallback note and the "what happens next" timeline.

### 0:50–2:05 — Live demo

1. **Dashboard** (`/`): city risk 80 High, Kawempe 93 Severe. Click Kawempe's map polygon or division row.
2. **Report** (`/report`): Kawempe → Bwaise II → 48 cm → "Fast-moving water" + "People trapped".
3. Add the **Bwaise demo photo**, name optional, submit.
4. Wait for triage (real Gemini or edge fallback). Show:
   - Critical severity, escalation banner;
   - the English and Luganda SMS tabs;
   - confidence and the model that answered.
5. **Broadcast** to ~1,850 subscribers.
6. **Alerts** (`/alerts`): the new alert is top of history; the report has left the verification queue and is marked responding.
7. **Route check**: Bwaise → City Centre. Show the flood delay and the "no low-risk route" warning.
8. **One-pager**: open `deliverables/FloodAlert-OnePager.pdf` for 17→18 reports, 42k reach, $356/month and SDG mapping.

### 2:05–2:30 — Impact and cost

> "At 4,000 reports and 40,000 SMS segments a month, the system costs about $356 — 8.9 cents per report. SMS is 95% of that. With a sponsored shortcode, infrastructure and AI are under $20 a month."

Point at the cost and pilot sections of the one-pager, not at feature count.

### 2:30–3:00 — The ask

> "We're asking for a 90-day pilot in Bwaise and Kisenyi with KCCA, the Red Cross and two Luganda radio stations. $15,000 covers 50 monitors, three months of SMS and radio, and independent M&E. Success: 60% of verified reports dispatched, under five minutes to warning, and 70% of residents saying the warning was clear and timely."

Close:

> "The water will come again. This time, the warning can arrive first."

## Recovery lines

- **No Gemini key:** "This is the deterministic edge model — same severity, actions and Luganda draft, no network dependency. The UI tells you which engine answered."
- **Network drops:** "Reports are already local. The form uses the edge model and syncs when the connection returns."
- **Firebase not configured:** "The nav says 'Demo data'. Firestore is optional; the local store is the offline source of truth."
- **Judge asks about false alarms:** "Critical reports require human verification before broadcast. The queue and status changes are visible in the app."
- **Judge asks about cost:** open `deliverables/FloodAlert-OnePager.pdf`.
- **Judge asks about privacy:** open the Safeguards section of the one-pager.

## Reset

- Footer → **Reset demo data** restores the 17 seeded reports, 6 alerts and circles.
- The deck has no live timer; use the presenter timer in PowerPoint or your phone.

## What is real vs simulated

| Real | Simulated / seeded |
| --- | --- |
| Next.js app, routing, local persistence | Kampala reports and alerts |
| Gemini request/fallback path | SMS/radio delivery |
| Division geometry (geoBoundaries) | Subscriber counts and reach |
| Risk/route calculations | Impact percentages and costs (modelled) |
| Firestore adapter (when configured) | Responder dispatch |

Say this out loud once. It builds more trust than pretending the demo is a live city service.
