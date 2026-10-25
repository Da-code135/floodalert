# FloodAlert — architecture notes

This document explains the technical decisions behind the prototype and what would change in production.

## 1. Runtime shape

```
Browser (Next.js App Router, client components)
  │
  ├─ localStorage store (default, offline-first)
  ├─ optional Firestore subscription + write-through
  │
  └─ POST /api/triage (Cloud Run / Node)
        ├─ Zod validation + rate limit
        ├─ Gemini 2.5 Flash (server key, 16s timeout, JSON schema)
        └─ edgeTriage() fallback (pure TypeScript)
```

The UI never talks to Gemini directly. The API key is read from the server environment (`GEMINI_API_KEY` or `GOOGLE_API_KEY`) and never serialized to the client.

## 2. Why a local-first store

The demo has to survive a conference Wi-Fi failure.

- The initial state is a seeded Kampala scenario (`src/data/seed.ts`).
- A versioned snapshot is stored in `localStorage` (`floodalert.state.v2`).
- All actions (add report, add alert, status change) update this store synchronously.
- Firestore is additive: when configured, snapshots merge by document ID; local data is never blocked on a network round trip.
- Cross-tab updates are picked up from the `storage` event.

Production would use IndexedDB (via Firestore's persistent cache or a small wrapper) for photo storage and a durable pending-write queue.

## 3. Triage pipeline

### Gemini path

`src/lib/gemini.ts`:

1. Build a prompt with area, division, landmark, depth, selected hazards and description.
2. Attach the photo inline as base64 (client resizes to ≤1000 px, JPEG 0.78).
3. Request strict JSON via `responseMimeType` + `responseSchema`, `temperature: 0.15`, `thinkingBudget: 0`.
4. Validate with Zod. Invalid output → fallback.
5. Return engine, severity, confidence, hazards, actions, English and Luganda alerts, escalation flag and latency.

Guardrails:

- 16-second `AbortSignal.timeout`.
- Max image payload 2.8 MB base64.
- 20 requests/minute/IP in-memory limit.
- Gemini failures are logged without the report body or photo.
- No PII in the prompt beyond optional reporter context (we do not send the reporter name).

### Edge path

`src/lib/triage.ts` is a pure function shared by client and server:

- severity is derived from depth, selected hazards and escalation keywords;
- actions are selected from a hazard matrix;
- English and Luganda templates are deterministic;
- confidence is a transparency signal, not a calibrated probability.

The edge model is not pretending to be computer vision. It is the deterministic floor that keeps a report moving when the model is unavailable.

## 4. Risk model

`src/lib/risk.ts` computes a 0–100 score per division:

```
35 × min(rain24h / 80, 1)
30 × min(weighted reports / 10, 1)
20 × vulnerability / 100
15 × (100 - drainage coverage) / 100
```

Report weight = `(severityRank + 1) × recencyFactor`, where recency is 1.0 (≤3h), 0.65 (≤6h), 0.35 (≤12h), 0.15 (≤24h).

The city score is population-weighted. The same score drives:

- choropleth colours and the division list;
- node risk in the route graph;
- the "people exposed" estimate (`population × vulnerability × 0.18 × score/100`).

All coefficients are visible in source and labelled in the UI. They are pilot defaults, not scientifically calibrated parameters.

## 5. Route engine

`src/lib/routing.ts`:

- 16 nodes (Bwaise, Kanyanya, Kawempe, Kyebando, Mulago, City Centre, Kisenyi, Katwe, Ndeeba, Nateete, Kawaala, Kabalagala, Bugolobi, Nakawa, Kinawataka, Luzira);
- 24 bidirectional road edges;
- node risk = `0.62 × division score + 0.38 × nearest hotspot exposure`;
- edge penalty from the average endpoint risk: +12 / +8 / +5 / +2 minutes;
- Dijkstra is run twice: weight = minutes (shortest) and minutes + penalty (safest).

If the safest route is still High or Severe, the UI warns that no low-risk route exists rather than inventing one.

## 6. Firestore integration

`src/lib/cloud.ts` lazy-loads the Firebase SDK so it is not in the initial bundle when unused.

- Anonymous auth (`signInAnonymously`) is required by the rules.
- `initializeFirestore` is called with `persistentLocalCache` + `persistentMultipleTabManager` for offline persistence.
- Reports and alerts are subscribed with `orderBy` + `limit`.
- Writes are best-effort; failures are logged and the local store remains the source of truth for the session.
- Photos under ~600 KB can be stored inline in the demo. Production should upload to Cloud Storage and store only a download URL.

Rules in `firestore.rules` require a signed-in user, validate field shape and restrict updates to `status`/`updatedAt`. Production should add a responder custom claim and App Check.

## 7. Offline & PWA

- `public/sw.js` caches the app shell and key routes in production; navigations are network-first with cached fallback to `/offline`.
- `ServiceWorkerRegister` registers only in production to avoid stale dev assets.
- The report form calls the pure edge model directly when `navigator.onLine` is false.
- A connection banner explains that reports are saved and synced later.
- Full RSC/offline navigation retries are a Next 16 experimental area; the prototype uses the service worker and client store instead.

## 8. Security posture

Implemented:

- server-only Gemini key;
- Zod validation and capped payloads;
- simple rate limiting;
- security headers (`nosniff`, `DENY` framing, referrer policy, permissions policy);
- no auto-dispatch;
- optional reporter identity;
- open attribution for data/photos.

Not production-ready:

- in-memory rate limit does not survive multiple instances;
- no App Check / bot protection;
- no admin authentication in the local demo;
- no face blurring or photo retention policy;
- no SMS gateway, delivery receipts or opt-out processing;
- no audit log or role-based access control.

## 9. Cost assumptions

At 4,000 reports/month:

| Component | Assumption | Cost |
| --- | --- | ---: |
| Gemini 2.5 Flash | ~1k input + 500 output tokens per report | $2 |
| Cloud Run | scale-to-zero, 2 vCPU, 512 MiB | $12 |
| Firestore | reports/alerts/read + small photos | $5 |
| SMS | 40k segments × UGX 32 | $337 |
| Monitoring | free tier | $0 |

Prices are planning estimates, not quotes. SMS dominates; a toll-free shortcode or telco CSR removes most of the cost.

## 10. Production roadmap

1. Calibrate risk weights against rain gauges and verified historic extents.
2. Replace the in-memory limit with a distributed limiter and add App Check.
3. Move photos to Cloud Storage; add blur/retention controls.
4. Add a responder role, audit log and alert approval workflow.
5. Integrate a real SMS/USSD aggregator and radio scheduling.
6. Add a queue for fan-out, retries and delivery receipts.
7. Run a 90-day Bwaise/Kisenyi pilot with independent M&E.
