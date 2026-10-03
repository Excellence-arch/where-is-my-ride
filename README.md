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

Sign in with any phone number and any 4-digit code.

## Screens and components

| Workflow | Components |
| --- | --- |
| A. Auth | `components/auth/SplashToAuth.tsx`: phone entry, then a mock 4-digit OTP (slide-up transition), then the dashboard |
| B. Dashboard | `DashboardLayout`, `DeliveryCard` (snap-x rail with a share button), `VoiceTriggerHero`, `VoiceSheet` (BimpeAI bottom sheet), `AIAuditTrail` |
| C. Live map | `LiveMapScreen`, `StaticMap` (inline SVG, so no API keys and no tiles), `TrackingSummary` (`top-4`), `TelemetryCard` (`bottom-24`) |
| God Mode | `components/godmode/GodModePanel.tsx` and `components/ui/ProximityToast.tsx` |

State lives in a single Zustand store (`lib/store.ts`).

## Hackathon God Mode

Triple-tap the **AO avatar** on the dashboard, or press **Shift+G** on desktop. A floating ⚡ button then stays on screen.

| Control | Effect |
| --- | --- |
| Network drop | Hides the rider pin and shows a dashed "last known" ghost pin, plus a `bg-slate-800` badge reading "Last Known Location (Offline) · time" |
| Heavy traffic | ETA changes from 15 to 35 Mins and the pill turns from emerald to amber |
| Trigger 2km geofence | Shows the Framer Motion toast "Rider Approaching: Segun is 2 minutes away." and sets the ETA to 2 Mins |
| Reset | Clears every override |

Each override is mirrored to the server (`POST /api/demo-state`), so **the BimpeAI agent says the same thing the screen shows**. The state is held in memory, which is fine for a single demo instance.

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
