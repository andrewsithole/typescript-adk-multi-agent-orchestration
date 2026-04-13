# Web Client Overview

This README covers how the `apps/web` Vite/React frontend works, how it talks to the API, and what to tweak when you hook it up to your own backend.

---

## Core Concepts
- Opinionated single-page app that wraps the hype-squad agent workflow exposed by `apps/api`.
- Uses native `EventSource` to consume `GET /api/run/stream` Server Sent Events and mirror the progress events documented in `apps/api/README.md`.
- Persists `userId` and `sessionId` in `localStorage` so visitors reconnect to the same session unless they explicitly create a new one.
- All state is managed via a lightweight reducer (`src/store/reducer.ts`) so the streaming UI stays responsive without external state libraries.
- Styling is done inline with a shared color palette in `src/constants.ts`; there is no CSS build step.

---

## Directory Map
- `src/ui/App.tsx` - top-level component that boots the store, manages sessions, opens/closes streams, and renders the layout.
- `src/components/*` - presentational building blocks: composer, activity log, judge result row, markdown output panels, etc.
- `src/store/` - reducer, context provider, and action definitions for UI state.
- `src/constants.ts` - colors, author label helpers, and the event factory used across the UI.
- `src/types.ts` - shared TypeScript types for SSE frames and rendered activity events.
- `vite.config.ts` - basic Vite configuration with React plugin (no custom proxying by default).

---

## Prerequisites
- Node 18+ (same requirement as the API app).
- The API server (`apps/api`) running on the same origin (default: `http://localhost:3000`). The web app assumes `/api/*` endpoints are reachable relative to the current origin.
- A valid Gemini API key configured for the API (see `apps/api/README.md` for setup). The web client does not read the key directly.

---

## Local Development
- Install dependencies once: `npm install`.
- Start the dev server (default port 5173): `npm run dev`.
- Navigate to `http://localhost:5173` in your browser while the API server is running (`npm run dev` from `apps/api`).

If you prefer to serve the built assets through the API server, run `npm run build` and copy the `dist/` output into your web host of choice. Vite's preview server is also available via `npm run preview -- --host`.

---

## How Streaming Works
- On mount, the app POSTs to `/api/sessions` with `userId` and `sessionId` (generated once per browser) until it receives a `201`.
- Starting a run triggers a probe (`GET /api/run/probe`) to ensure no active stream is already running for that session. Conflicts surface as a system message prompting the user to wait or start a new session.
- When clear, it opens an `EventSource` on `/api/run/stream` with query params (`userId`, `sessionId`, `q`, `model`, `maxIterations`).
- SSE event handlers map directly to UI updates:
  - `progress` events add entries to the activity log and append tool call/response metadata.
  - `error` events render inline notifications and stop the spinner.
  - `final` events close the stream, mark completion, and ensure the latest `judge_output`, `twitter_output`, and `linkedin_output` land in state.
- The reducer trims the activity feed to the latest 500 events to keep memory usage predictable.

---

## Key UI Details
- **Composer** (`src/components/Composer.tsx`) enforces the 1-2000 character query window that the API validates. It exposes Start/Stop buttons that toggle based on `isLoading`.
- **Activity log** (`src/components/ActivityLog.tsx`) collapses by default after the first run and can be toggled to show tool usage, judge status, and escalation signals.
- **Output panels** (`src/components/OutputPanels.tsx`) render Twitter and LinkedIn drafts via `react-markdown`, with loading placeholders while each channel is still generating.
- **Judge summary** (`src/components/JudgeRow.tsx`) colors feedback according to the judge's pass/fail status once available.
- **Streaming indicator** (`src/components/Indicator.tsx`) displays the animated "Working..." message that mirrors the latest SSE text snippet.

---

## Integration Tips
- CORS is not configured in this app; serve the API and web client from the same domain (or add a Vite dev proxy to `vite.config.ts` if you move the API).
- To capture analytics or persist history, listen to the reducer's `ADD_EVENT` actions in a custom provider or forward SSE frames to your own backend before dispatching.
- The UI currently hard codes `model=gemini-2.5-flash` and `maxIterations=1`; expose those sliders in `Composer` if you want runtime control.
- For deployments, ensure your static host rewrites unmatched routes to `index.html` so refreshes on deployed environments do not 404.

---

## Troubleshooting
- **Session fails to create**: check the browser console network tab for `/api/sessions` and ensure the API server is reachable.
- **Streams stop immediately**: confirm the API key is set and the API README rate limits are not being hit; the UI will show the server's `error` event text.
- **Mixed content warnings**: if you serve the site over HTTPS, proxy the API through HTTPS as well or configure a secure reverse proxy to avoid blocked requests.
- **No activity shown**: toggle the activity panel; if still empty, inspect SSE events in dev tools to ensure the `EventSource` connection stays open.

Happy shipping!
