# API & Request Lifecycle Documentation

This README explains how the `apps/api` service is put together, what the endpoints expect, and how to wire it up with Google's Gemini models so you can start streaming responses immediately.

---

## Overview
- Express server that showcases AI agent orchestration end-to-end, highlighting how sequential, looping, and parallel agents collaborate.
- Demonstrates tooling within the agent network, including Google Search (`google_search` built-in) and custom FunctionTools (e.g., the `web_scrape` HTML fetcher).
- Uses `@google/adk` for agent execution, `zod` for runtime validation, and Server-Sent Events (SSE) for live updates.
- Sessions and rate limiting are handled purely in memory; restart = clean slate so you can observe fresh orchestrations.

### Directory Highlights
- `src/server.ts` - Express entry point, routes, rate limiting, SSE wiring.
- `src/schemas.ts` - Zod definitions for body and query validation (with tests in `src/schemas.test.ts`).
- `src/agents/` - All agent definitions (research loop, judge, formatters, wrappers, escalation logic).
- `src/tools/` - Custom ADK tools (e.g., `web_scrape` HTML fetcher).
- `src/logger.ts` - Winston logger setup with optional file rotation.

---

## Environment & API Keys
- Copy `.env.example` from the repo root (if available) or create `../../.env`.
- Update `GEMINI_API_KEY` in .env
- Optional vars:
  - `APP_NAME` (defaults to `ts-multi-agents`).
  - `PORT` (defaults to `3000`).
  - `LOG_LEVEL` (`info` default), `LOG_FILE=true` to enable `logs/` rotation.
  - `RESEARCH_LOOP_MAX` (1-10, defaults to 3).

### Getting a Gemini API key (plug & play)
1. Visit [ai.google.dev](https://ai.google.dev/).
2. Sign in and open **AI Studio** (or go straight to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
3. Create a new API key (project name is optional).
4. Copy the key and paste it into your `../../.env` file: `GEMINI_API_KEY=your-key-here`.
5. Restart `npm run dev` so the server picks up the new environment variables.

No additional provisioning is required for the API to function locally. Just ensure your key has access to `gemini-2.5-flash`.

---

## Running Locally
- Install deps once: `npm install`.
- Dev server with live reload: `npm run dev`.
- Type-only build output: `npm run build`.
- Contract tests (Zod schemas): `npm test`.

The dev server listens on `http://localhost:${PORT || 3000}`.

---

## Core Endpoints & Limits

| Method & Path | Description | Rate Limit (per IP per minute) | Notes |
| --- | --- | --- | --- |
| `GET /healthz` | Health probe | n/a | Returns `200 ok`. |
| `POST /api/sessions` | Create or reuse a session ID | 20 | Body validated against `SessionCreateBody`. |
| `GET /api/sessions/:userId` | List session IDs + timestamps | 20 | 404 if `userId` missing. |
| `DELETE /api/sessions/:userId/:sessionId` | Remove a session | 20 | Also clears in-memory stream guard. |
| `GET /api/run/probe` | Check if a stream is active | 30 | 204 if free, 409 if running, 404 if session missing. |
| `GET /api/run/stream` | Start SSE conversation | 12 | Requires `Accept: text/event-stream`. |

**Request validation (`src/schemas.ts`):**
- `userId` / `sessionId`: strings 1-128 chars.
- `q`: string 1-2000 chars.
- `maxIterations`: optional number (1-100 after coercion).

The server responds with a structured error body (`{ error, code, reqId }`) for validation failures, rate limits, and 4xx/5xx errors. Each response includes `X-Request-Id`.

---

## Streaming Mechanics (`GET /api/run/stream`)
- Requires query parameters `userId`, `sessionId`, `q` (and optional `maxIterations`), plus `Accept: text/event-stream`.
- Headers applied: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`, `X-Request-Id`.
- Preamble includes `retry: 5000` for client auto-retry handling.
- Keepalive comment (`: keepalive`) sent every 15s.

### Event Types
- `progress`: includes `author`, `text`, arrays of tool calls/responses, `escalate` flag, and accumulated `judge_output`, `twitter_output`, `linkedin_output`.
- `error`: emitted on runtime failures (`{ error, code, reqId }`).
- `final`: final snapshot when outputs are available, even if they were only stored in session state.

The server suppresses raw text from internal research/judge authors unless it's a progress update or includes tool activity. Clients should expect curated progress plus final formatted outputs.

### Session & Stream Guardrails
- Strict session check: the session must exist (via `POST /api/sessions`) before streaming (`404 session_not_found` otherwise).
- Only one active stream per `(userId, sessionId)`; duplicates return `409 stream_exists`. Use `/api/run/probe` before starting a stream if your client may reconnect.
- In-memory session TTL: entries expire 30 minutes after last activity and are purged every 5 minutes.

---

## Agent Workflow Primer
1. **Research loop (`research_loop`)**
   - Conditional researcher decides between web search (`google_search` tool) or scraping provided URLs using the custom `web_scrape` tool.
   - Judge agent scores the research; escalation checker exits the loop once the research passes quality gates.
2. **Formatters gate (`format_gate`)**
   - Skips formatting if judge fails and emits guidance.
   - On pass, runs a parallel formatter agent producing:
     - `twitter_output` (threadWhiz LLM agent).
     - `linkedin_output` (theProfessional LLM agent).
3. Final outputs are surfaced via SSE events and stored in session state for retrieval in `final` snapshots.

---

## Logging
- Logger instances (`createLogger(context)`) write to console with colorized timestamps.
- Set `LOG_FILE=true` for rotating JSON logs in `logs/YYYY-MM-DD.log`.
- All major stages (agent instructions, state updates, errors) are tagged with their context (e.g., `server`, `researcher`, `judge`).

---

## Troubleshooting Checklist
- **429 rate_limited**: back off for a minute per IP + path combination.
- **404 session_not_found**: create the session first via `POST /api/sessions`.
- **406 not_acceptable**: ensure your client sets `Accept: text/event-stream`.
- **401/403 from Gemini**: confirm the API key is present in `../../.env` and not rate limited.
- **Missing final outputs**: listen for the `final` SSE event; it backfills outputs from session state even if intermediate deltas were missed.

Happy building! Let the stream flow.
