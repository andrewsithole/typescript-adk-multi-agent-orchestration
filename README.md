# ts-multi-agents

Demonstration project that stitches together orchestrated AI agents with a TypeScript Express API and a Vite/React web client. It highlights how to combine sequential, looping, and parallel agent patterns, integrate Google Search plus custom FunctionTools, and stream structured progress to the browser in real time.

---

## Architecture at a Glance
- **apps/api** &mdash; Express server using `@google/adk` to run the *hype squad* workflow:
  - Sequential pipeline: research loop -> formatting gate.
  - Research loop is a `LoopAgent` that can escalate out once a judge approves quality.
  - Formatters run in parallel to generate Twitter and LinkedIn outputs.
  - Tools include the built-in `google_search` and a custom `web_scrape` FunctionTool.
  - Streams progress over Server-Sent Events so clients can display incremental updates.
- **apps/web** &mdash; Vite/React SPA that:
  - Creates and reuses API sessions stored in `localStorage`.
  - Opens an `EventSource` to `/api/run/stream`, mirrors activity logs, and renders formatted social posts.
  - Keeps UI state in a small reducer for predictable streaming updates.

See the app-specific READMEs (`apps/api/README.md`, `apps/web/README.md`) for deep dives into each surface.

---

## Prerequisites
- Node.js 18 or newer.
- Google Gemini API key with access to `gemini-2.5-flash`.
- macOS, Linux, or WSL recommended (Windows works with a compatible shell).

---

## Setup
1. Install dependencies in the repo root (covers both apps):
   ```bash
   npm install
   ```
2. Create `.env` at the repository root (or copy from `.env.example` if present) and add:
   ```bash
   GEMINI_API_KEY=your-key-here
   ```
   The API normalizes `GEMINI_API_KEY`, `GOOGLE_API_KEY`, and `GENAI_API_KEY`, so any of those names work.
3. Optional environment tweaks:
   - `APP_NAME` (defaults to `ts-multi-agents`)
   - `PORT` for the API (defaults to `3000`)
   - `RESEARCH_LOOP_MAX` to cap loop iterations (1-10, default 3)
   - `LOG_LEVEL`, `LOG_FILE=true` for rotated logs

Need a key? Visit [ai.google.dev](https://ai.google.dev/), open AI Studio, generate an API key, and drop it into the `.env` file before starting the API.

---

## Running the Stack

### API (apps/api)
```bash
cd apps/api
npm run dev
```
- Launches the Express server with tsx watch mode on `http://localhost:3000`.
- Streams SSE results from `GET /api/run/stream`, enforces rate limits, and requires sessions created via `POST /api/sessions`.
- Detailed endpoint documentation lives in `apps/api/README.md`.

### Web Client (apps/web)
```bash
cd apps/web
npm run dev
```
- Starts Vite on `http://localhost:5173`.
- Assumes the API is reachable at `http://localhost:3000`; runs entirely in the browser with native `EventSource`.
- Additional UI notes and integration guidance are in `apps/web/README.md`.

---

## Quickstart Flow
1. Start the API (`npm run dev` in `apps/api`).
2. Start the web client (`npm run dev` in `apps/web`).
3. Open `http://localhost:5173`, enter a topic, and watch the orchestrated agents research, judge, and format the results.
4. Use the activity log to follow each agent's contribution, including tool calls (Google Search, web scraping) and judge feedback.

---

## Testing & Builds
- API schema tests: `cd apps/api && npm test`
- API build: `cd apps/api && npm run build`
- Web production build: `cd apps/web && npm run build`
- Web preview: `cd apps/web && npm run preview -- --host`

---

## Project Structure
```
apps/
  api/   # Express + ADK server powering the agents and SSE endpoints
  web/   # Vite/React frontend consuming the streaming API
```

---

## Further Reading
- `apps/api/README.md` &mdash; Endpoint catalog, streaming contract, logging, and environment specifics.
- `apps/web/README.md` &mdash; UI reducer flow, component map, and deployment tips.
- `src/agents/` under `apps/api` &mdash; Concrete agent implementations (researcher, judge, threadWhiz, etc.).
- `src/tools/` under `apps/api` &mdash; Custom FunctionTool examples like `web_scrape`.

Contributions, experiments, and forks are welcome. Have fun orchestrating!
