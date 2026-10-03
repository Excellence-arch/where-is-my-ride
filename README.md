# WhereIsMyRider

A Next.js PWA prototype for tracking dispatch riders, with a **BimpeAI** voice agent. The frontend and the backend (webhook and API routes) ship together in one Next.js app.

- **Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, Zustand, lucide-react
- **Design:** flat, high contrast, no gradients (slate-50 background, white cards, `rounded-[24px]`, solid `blue-600` actions)
- **PWA:** web manifest, installable icons and a service worker that caches the app shell. Install it from the browser's "Add to Home Screen".

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start   # production + service worker
```

Routes: `/` is the landing page, `/app` the customer app (sign in with any phone number and any 4-digit code), and `/rider` the rider app.

## Screens and components

| Workflow | Components |
| --- | --- |
| A. Auth | `components/auth/SplashToAuth.tsx`: phone entry, then a mock 4-digit OTP (slide-up transition). New customers are asked for their full name (stored in `customers`); returning customers go straight to the dashboard |
| B. Dashboard | `DashboardLayout`, `DeliveryCard` (snap-x rail with a share button), `VoiceTriggerHero`, `VoiceSheet` (BimpeAI bottom sheet), `AIAuditTrail` |
| C. Live map | `LiveMapScreen`, `StaticMap` (inline SVG, so no API keys and no tiles), `TrackingSummary` (`top-4`), `TelemetryCard` (`bottom-24`) |
| God Mode | `components/godmode/GodModePanel.tsx` and `components/ui/ProximityToast.tsx` |

State lives in a single Zustand store (`lib/store.ts`).

## Rider app (`/rider`)

Riders sign in with their phone and a mock OTP. New riders register their **full name, vehicle type and plate number** (stored in `riders`), then pick up one of the open deliveries. The customer, the rider app and the voice agent then use the registered rider's name and vehicle, and the signed-in customer's name. Riders tap **Start trip & share live location**. The phone's GPS (`watchPosition`, high accuracy, about every 4 s or 15 m) is posted to `/api/rider/location` and stored in Postgres (Neon). The customer app polls `/api/live` every 3 s, and when a trip is live it switches from the static illustration to a real map (Leaflet with CARTO light tiles, no API key needed).

- **Live data:** street name (OpenStreetMap reverse geocoding), distance, ETA (from distance plus GPS speed) and a LIVE GPS badge. The BimpeAI agent's `track_delivery` reads the same data.
- **Real network drop:** if the rider's phone stops reporting for 45 s, the customer sees "Last Known Location (Offline)" and the agent says so.
- **Real 2 km geofence:** the "Rider Approaching" alert fires when the rider crosses 2 km from the drop-off.
- **Mark as delivered** shows Delivered on the customer side, and the agent confirms the delivery.
- **Demo drive** simulates GPS moving towards the drop-off, which is handy on stage. If the rider is more than 30 km from the real address (not in Lagos), a stand-in drop-off 3 km away is used so the ETA and alert still work.
- A screen wake lock keeps the phone awake. Browsers can't share GPS in the background, so the rider keeps the page open.

## Hackathon God Mode

Triple-tap the **AO avatar** on the dashboard, or press **Shift+G** on desktop. A floating ⚡ button then stays on screen.

| Control | Effect |
| --- | --- |
| Network drop | Hides the rider pin and shows a dashed "last known" ghost pin, plus a `bg-slate-800` badge reading "Last Known Location (Offline) · time" |
| Heavy traffic | ETA changes from 15 to 35 Mins and the pill turns from emerald to amber |
| Trigger 2km geofence | Shows the Framer Motion toast "Rider Approaching: Segun is 2 minutes away." and sets the ETA to 2 Mins |
| Reset | Clears every override |

Each override is stored on the server (`POST /api/demo-state`, Postgres when `DATABASE_URL` is set), so **the BimpeAI agent says the same thing the screen shows**. God Mode still works on top of live GPS: traffic adds 20 minutes to the live ETA, and a network drop forces the offline state.

## BimpeAI integration

| Route | Purpose |
| --- | --- |
| `POST /api/track` | **Voice-agent webhook.** Takes `{ "waybill_id": "lg 90210" }` and returns `{ success, data, message }`. In-memory lookup, about 5 ms. Normalises speech transcriptions such as `"L G nine oh two one oh"` and `"LG dash 90210"`. Also accepts `GET ?waybill_id=` |
| `POST /api/bimpe/ask` | Used by the in-app voice sheet. Forwards the transcribed question to your BimpeAI agent (Agent Console API, webchat test channel) and waits up to about 9 s for the reply. Falls back to a local answer if BimpeAI isn't configured or doesn't respond |
| `POST /api/bimpe/call` | **Get a call from BimpeAI.** Takes `{ phone, waybillId }`. The BimpeAI agent rings that number (`is_test_call: true`) and answers questions about the order on the call, looking it up through `track_delivery` (`/api/track`) |
| `GET /api/bimpe/call/:id` | Call status (`queued → ringing → answered → ended`) and transcript, polled by the call sheet |
| `GET /api/bimpe/setup` | Sets up the agent; safe to call more than once. Reuses an agent named "WhereIsMyRider…" or creates a "WhereIsMyRider Assistant" agent for order support, then registers the `track_delivery` tool against the production URL |
| `GET/POST /api/demo-state` | God Mode sync |

The voice sheet uses the browser's Web Speech API for speech-to-text and `speechSynthesis` to read the answer aloud. If speech isn't available, it falls back to typed input and quick prompts.

### Connect your agent

1. Copy `.env.example` to `.env.local` and set `BIMPEAI_API_KEY` (`sk_…`). `BIMPEAI_AGENT_ID` is optional: without it the app reuses your first agent, or creates a "WhereIsMyRider Assistant" agent (and registers its `track_delivery` tool) on first use. Calls are placed with `is_test_call: true`. Check the connection at `GET /api/bimpe/status`.
2. Deploy, for example to Vercel, and add the same env vars there.
3. Register the webhook as a tool on the agent:
   ```bash
   PUBLIC_APP_URL=https://your-app.vercel.app npm run bimpe:register-tool
   ```
   This creates a `custom_api` integration with a `track_delivery` tool that sends `POST /api/track` with a `waybill_id` body parameter.
4. In your agent's workflow prompt, add something like: *"When a customer asks where their rider or order is, ask for the waybill number, call `track_delivery`, and read back the `message` field."*

Without keys, every BimpeAI-backed route runs in demo mode: answers are generated locally and calls are simulated, so the pitch never breaks.

### Test the webhook

```bash
curl -X POST localhost:3000/api/track -H 'content-type: application/json' -d '{"waybill_id":"lg 90210"}'
```

Demo waybills: `LG-90210` (Segun, the hero delivery), `LG-44021` (Chinedu), `AB-11873` (Musa).
