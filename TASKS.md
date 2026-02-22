# Project Tasks and JIRA-Style Stories

This file organizes the next set of explicit, hand-off-ready stories to take the current multi‑agent service to a web-accessible, Cloud Run–deployable application. Each story is self-contained with assumptions, rationale, detailed steps, acceptance criteria, and a test plan.

Conventions:
- IDs use the prefix `APP-<n>` for easy tracking in JIRA.
- File references are workspace-relative and point to where work should land.
- Default environment: Node 20+, TypeScript `module: nodenext`, and Google ADK `@google/adk`.

Status note: A minimal API (Express + SSE) and web (Vite+React) scaffolding already exists:
- API entry: apps/api/src/server.ts
- Web entry: apps/web/src/ui/App.tsx, apps/web/src/main.tsx, apps/web/index.html
- Root scripts: package.json

---

## APP-1 — Solidify API SSE endpoint and request validation

Background/Why
- The current SSE endpoint works but needs validation, error hygiene, and abort handling to be production-ready.

Assumptions
- Keep Express; Cloud Run will front with HTTPS and terminate TLS.
- Continue with InMemorySessionService until persistence stories land.

Scope
- Harden GET `/api/run/stream`, POST `/api/sessions`.
- Add request validation, input size limits, and graceful abort.

Out of Scope
- No auth (covered in APP-9).

Detailed Steps
1) Add zod request validation for query/body.
2) Add max length checks: `q` ≤ 2000 chars, `userId`/`sessionId` ≤ 128.
3) Implement graceful abort: on `req.close`, set a flag to stop streaming.
4) Ensure SSE keepalive every 15s; include `retry: 5000` preamble.
5) Add uniform error shape: `{ error, code }` and map common errors.
6) Log start/stop with a requestId header or generated ID.

Acceptance Criteria
- Invalid inputs return 400 with structured JSON error.
- Closing the client connection stops the ADK event loop within ~1s.
- Keepalive comments (":\n\n") are emitted at least every 30s.
- All errors in the stream are sent as one final `data:` frame, then connection closes.

Test Plan
- Happy path: curl the stream and observe JSON frames until natural end.
- Invalid query: missing `userId` → 400 JSON.
- Long `q` (>2000) → 400 JSON.
- Abort: close curl mid-stream; server logs show stopped stream.

Estimate: 1–2 days
Dependencies: None
Risks: Long runs leak; Mitigation: Attach `close` and always `clearInterval`.

---

## APP-2 — Refactor core agents into a sharable module for runtime builds

Background/Why
- The API currently imports TS via ts-node/esm. For Cloud Run, we want compiled JS with stable import paths.

Assumptions
- Keep TypeScript builds via `tsc`.
- Keep ADK version pinned.

Scope
- Move `researcher.ts`, `judge.ts`, `orchestrator.ts` into `packages/core/src/`.
- Add `packages/core/package.json` + `tsconfig.json` to build to `packages/core/dist/`.
- Update API server to import from `packages/core/dist` at runtime.

Out of Scope
- No business logic changes to agents.

Detailed Steps
1) Create `packages/core/tsconfig.json` (extends root), `outDir: dist`, `rootDir: src`.
2) Move files:
   - researcher.ts → packages/core/src/researcher.ts
   - judge.ts → packages/core/src/judge.ts
   - orchestrator.ts → packages/core/src/orchestrator.ts
3) Fix internal imports to use `.js` extensions in source (NodeNext).
4) Add `build` script in `packages/core/package.json` and root script `build:core`.
5) Update `apps/api/src/server.ts` to `import { courseCreator } from '../../../packages/core/dist/orchestrator.js'`.

Acceptance Criteria
- `npm run build:core && npm run build:api && npm run start:api` starts server without ts-node.
- No TypeScript errors; runtime imports resolve to built JS.

Test Plan
- Build locally; run API; hit `/healthz` and `/api/run/stream`.

Estimate: 1–2 days
Dependencies: APP-1 optional
Risks: Import path drift; Mitigation: Add postbuild check script.

---

## APP-3 — Implement Firestore-backed SessionService (persistence)

Background/Why
- In-memory sessions don’t survive restarts or scale-to-zero. Firestore provides durable, serverless storage.

Assumptions
- Use Google Cloud Firestore in Native mode.
- Minimal schema; large event payloads acceptable for MVP.

Scope
- Implement a class extending `BaseSessionService` using Firestore.
- Replace `InMemorySessionService` in API via env toggle.

Out of Scope
- Full-text search across events.

Detailed Steps
1) Add GCP client libs: `@google-cloud/firestore` to apps/api.
2) Create `apps/api/src/services/firestore_session_service.ts` implementing required methods from `BaseSessionService` (reference: node_modules/@google/adk/dist/types/sessions/base_session_service.d.ts).
3) Data model:
   - Collection: `apps/{appName}/users/{userId}/sessions/{sessionId}` doc with lightweight session metadata.
   - Subcollection: `events` (ordered by timestamp); state stored on session doc.
4) Implement `appendEvent` to atomically append event and merge state.
5) Add `SESSION_BACKEND=firestore|memory` switch; default to memory.
6) Update server to select implementation at startup.

Acceptance Criteria
- With `SESSION_BACKEND=firestore`, sessions and events persist across restarts.
- `listSessions`, `getSession`, `appendEvent` behave as ADK expects.

Test Plan
- Run stream; restart server; `getSession` still returns data.
- Append multiple events; verify order and state merge.

Estimate: 3–4 days
Dependencies: APP-1, APP-2
Risks: Firestore write throughput; Mitigation: batch writes and indexes.

---

## APP-4 — Plug GCS ArtifactService into Runner (artifact durability)

Background/Why
- Artifacts should be persisted out of process. ADK provides `GcsArtifactService` out of the box.

Assumptions
- A GCS bucket exists; service account has read/write.

Scope
- Instantiate `GcsArtifactService` and pass to `Runner` in API.

Out of Scope
- Signed URL download endpoints.

Detailed Steps
1) Create env `ARTIFACT_BUCKET`.
2) Wire in apps/api/src/server.ts: `new GcsArtifactService(process.env.ARTIFACT_BUCKET!)` and pass to `Runner`.
3) Add basic endpoint `GET /api/artifacts/:filename` that proxies latest version via `artifactService.loadArtifact` (optional).

Acceptance Criteria
- Incoming inline artifacts are saved to GCS; stream shows replaced placeholders (as per ADK behavior).

Test Plan
- Trigger a run that yields an artifact (or simulate); verify object in bucket.

Estimate: 1 day
Dependencies: APP-2
Risks: Bucket IAM; Mitigation: Use Workload Identity & least privilege.

---

## APP-5 — Frontend: polish SSE client, controls, and log rendering

Background/Why
- The UI should mirror CLI logs and allow basic control of sessions and queries.

Assumptions
- Keep Vite + React SPA.

Scope
- Add form validation, loading states, and auto-scroll for logs.
- Provide model toggle and `maxIterations` control (sent as query or via POST config, later wired into ADK runConfig or agent settings).

Out of Scope
- Auth (APP-9), multi-user management.

Detailed Steps
1) Validate `apiBase`, `userId`, `sessionId` (non-empty, max lengths), `query` (≤ 2000 chars).
2) Add “Auto-scroll” checkbox; keep last N lines (e.g., 1000) to cap memory.
3) Add model select (e.g., `gemini-1.5-flash`, `gemini-2.0-flash`) and pass via query for now; the API will thread it (APP-7 optional).
4) Style with minimal CSS.

Acceptance Criteria
- UI blocks invalid input; shows inline errors.
- Logs auto-scroll when enabled; performance stays smooth with long streams.

Test Plan
- Manual UI run against local API; verify controls and log output.

Estimate: 2 days
Dependencies: APP-1
Risks: Event flooding; Mitigation: throttle render with requestAnimationFrame.

---

## APP-6 — Secrets and configuration management

Background/Why
- Cloud Run should not rely on `.env`. Secrets must come from Secret Manager or runtime env.

Assumptions
- Use Google Secret Manager for `GOOGLE_API_KEY`.

Scope
- Define required envs and document how to supply them locally and in Cloud Run.

Detailed Steps
1) Document required envs in README: `GOOGLE_API_KEY`, `APP_NAME`, `SESSION_BACKEND`, `ARTIFACT_BUCKET`.
2) Add sample `.env.example` (no secrets).
3) Add Cloud Run deploy notes referencing Secret Manager bindings.

Acceptance Criteria
- Local starts with `.env` (optional) and Cloud Run deploy instructions clearly show secret injection.

Test Plan
- Verify app reads from env when present; falls back to sensible defaults when safe.

Estimate: 0.5 day
Dependencies: None
Risks: Misconfigured secrets; Mitigation: startup validation with clear logs.

---

## APP-7 — Model upgrade toggle and Google Search tool visibility

Background/Why
- Built-in Google Search tool is auto-invoked on Gemini 2 models. The UI should reflect tool activity.

Assumptions
- Switching model is acceptable per-run (or per-server via env).

Scope
- Add model selection to UI and thread to API. API passes model to LlmAgent or uses a clone with overridden `model`.

Detailed Steps
1) UI: add `model` select. Include `gemini-1.5-flash`, `gemini-2.0-flash`.
2) API: accept `model` query param; for the live run, adjust `courseCreator` subagent’s `model` (clone agent or parameterize before Runner invocation).
3) Confirm tool call/response lines appear on Gemini 2 via SSE.

Acceptance Criteria
- On Gemini 2, SSE frames include `calls/responses` with `google_search` when the model chooses to invoke it.

Test Plan
- Manual runs toggling models; observe log differences.

Estimate: 1–2 days
Dependencies: APP-1, APP-2
Risks: Agent mutation across runs; Mitigation: create a per-request agent instance.

---

## APP-8 — Authentication (Firebase Auth) for API and UI

Background/Why
- Protect endpoints in production; simple, managed auth via Firebase suits SPA + Cloud Run.

Assumptions
- Use Firebase Authentication (Google provider); pass ID token as `Authorization: Bearer <token>`.

Scope
- UI login + token storage.
- API middleware: verify Firebase token.

Detailed Steps
1) UI: integrate Firebase Web SDK; add login/logout; attach token to SSE via query (or switch to POST with Fetch+ReadStream if needed).
2) API: add middleware using `firebase-admin` to verify tokens; reject unauthorized.
3) CORS: restrict to frontend origin.

Acceptance Criteria
- Unauthenticated requests receive 401.
- Authenticated users can stream and create sessions.

Test Plan
- Manual login in UI; inspect requests; verify 200 with token, 401 without.

Estimate: 3 days
Dependencies: APP-1, APP-5
Risks: SSE with auth headers; Mitigation: use query param token or upgrade to fetch streaming.

---

## APP-9 — Observability: structured logging and basic metrics

Background/Why
- Cloud Run benefits from structured JSON logs and basic counters.

Assumptions
- Use console JSON logs; Cloud Logging parses automatically.

Scope
- Add requestId, userId, sessionId to logs; count frames; log durations.

Detailed Steps
1) Wrap server logs with a small logger util emitting JSON.
2) Log stream start/stop, frame counts, and total duration per run.
3) Include error codes and stack traces (sanitized) on failures.

Acceptance Criteria
- Logs visible in Cloud Logging with structured fields: `severity`, `requestId`, `userId`, `sessionId`.

Test Plan
- Run locally; verify log shape; deploy to Cloud Run and inspect logs.

Estimate: 1 day
Dependencies: APP-1
Risks: PII leakage; Mitigation: avoid logging prompts/results verbatim in prod.

---

## APP-10 — Dockerize API and prepare Cloud Run deployment

Background/Why
- Containerize for reproducible Cloud Run deploys.

Assumptions
- Single-container API for now; UI served separately (e.g., Firebase Hosting) or as static build behind the API.

Scope
- Create Dockerfile; add `npm run build:api` layer; expose `PORT`.

Detailed Steps
1) Dockerfile (multi-stage):
   - Build stage: `npm ci`, `npm run build:core`, `npm run build:api`.
   - Runtime: `node:20-alpine`, copy `dist/`, `node_modules` (prod), `CMD ["node","dist/server.js"]`.
2) Add `.dockerignore` (node_modules, dist in non-relevant paths, .env, etc.).
3) Update README with `gcloud run deploy` commands and required envs.

Acceptance Criteria
- `docker build` succeeds locally; container runs and serves `/healthz`.

Test Plan
- `docker run -p 3000:3000` and curl endpoints.

Estimate: 1 day
Dependencies: APP-2
Risks: Image bloat; Mitigation: multi-stage and `--omit=dev`.

---

## APP-11 — CI workflow for build, lint, and container publish

Background/Why
- Automate container builds and pushes to Artifact Registry.

Assumptions
- GitHub Actions or Cloud Build; prefer GitHub Actions for repo events.

Scope
- Add CI to build core, api, run typecheck, then build and push image on main.

Detailed Steps
1) `.github/workflows/ci.yml`: install, `tsc --noEmit`, `docker build`, `docker push` to `us-docker.pkg.dev/<project>/<repo>/<image>`.
2) Store registry creds/secrets in GitHub OIDC or actions secrets.

Acceptance Criteria
- Merges to main produce a tagged image; logs available in Actions.

Test Plan
- Push test branch; verify workflow.

Estimate: 1–2 days
Dependencies: APP-10
Risks: Secrets mgmt; Mitigation: OIDC workload identity federation.

---

## APP-12 — Improve judge output reliability (schema enforcement)

Background/Why
- Ensure `judge_output` is always present and parseable to power UI state logs.

Assumptions
- The judge can be prompted to return only JSON; ADK supports `outputSchema` already.

Scope
- Tighten judge instruction and/or add `afterModelCallback` to coerce output.

Detailed Steps
1) Update `packages/core/src/judge.ts` instruction: “Reply ONLY with a JSON object matching the schema. No prose.”
2) Optionally add `afterModelCallback` in `LlmAgent` config to parse text to JSON; on failure, set `status: 'fail'` with feedback.

Acceptance Criteria
- During runs, `judge_output` appears in session state almost every iteration.

Test Plan
- Manual runs; verify SSE `[state] judge_output = ...` shows up routinely.

Estimate: 1 day
Dependencies: APP-2
Risks: Over-constraining the model; Mitigation: provide examples/few-shots.

---

## APP-13 — Frontend: session history and resume

Background/Why
- Users should resume or review past sessions.

Assumptions
- Depends on Firestore-backed sessions.

Scope
- List a user’s sessions; attach to a session to stream new events.

Detailed Steps
1) API: `GET /api/sessions?userId=` returns a list (from Firestore service).
2) UI: panel showing sessions, click to select and stream new events.

Acceptance Criteria
- Visible session list; selecting a session streams new events appended to it.

Test Plan
- Create multiple sessions; verify switching works.

Estimate: 2 days
Dependencies: APP-3, APP-5
Risks: Pagination; Mitigation: limit to last N sessions.

---

## APP-14 — Documentation and runbook

Background/Why
- Smooth onboarding for future contributors and reliable operations.

Assumptions
- Docs live in README and a `docs/` folder.

Scope
- Update README and add runbook covering local dev, deployment, troubleshooting.

Detailed Steps
1) README: architecture diagram, envs, how to run API/UI locally, how to deploy.
2) docs/runbook.md: alert sources, common errors (API key, Firestore perms), how to roll back, where to find logs.

Acceptance Criteria
- A new engineer can set up and deploy in under 1 hour following docs.

Test Plan
- Have a teammate run through the steps and provide feedback.

Estimate: 1 day
Dependencies: APP-1..APP-10
Risks: Docs drift; Mitigation: make doc updates part of DoD.

