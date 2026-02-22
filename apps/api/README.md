# API & Request Lifecycle Documentation

This document explains how the `apps/api` server works, its endpoints, and how requests flow through the system.

---

## 🚀 Overview

The API serves as the bridge between a user (e.g., a frontend app) and the AI agents. It handles session management, validates user input, and streams real-time responses from the AI using **Server-Sent Events (SSE)**.

### Key Technologies
- **Express.js**: The web framework for handling HTTP requests.
- **Zod**: A validation library to ensure incoming data is correct.
- **@google/adk**: The "Agent Development Kit" used to run the orchestrated AI.
- **SSE (Server-Sent Events)**: A way for the server to "push" multiple messages to the client over a single connection.

---

## 🛣️ API Endpoints

### 1. `GET /healthz`
- **Purpose**: A simple "ping" to check if the server is alive.
- **Response**: `200 OK` with the text `"ok"`.

### 2. `POST /api/sessions`
- **Purpose**: Registers a new session for a user.
- **Request Body** (JSON):
  ```json
  {
    "userId": "user-123",
    "sessionId": "session-abc" // Optional
  }
  ```
- **What it does**:
  1. Validates the JSON using `SessionCreateBody` (defined in `src/schemas.ts`).
  2. Stores the session in the **InMemorySessionService**.
  3. Returns the session details.

### 3. `GET /api/run/stream`
- **Purpose**: The main endpoint for chatting with the AI.
- **Query Parameters**:
  - `userId`: (Required) The unique ID of the user.
  - `sessionId`: (Required) The session to use.
  - `q`: (Required) The user's question or message.
- **Response**: A **stream** of JSON objects (SSE).

---

## 🌊 The Request Lifecycle (Step-by-Step)

When a user calls `GET /api/run/stream`, the following sequence happens:

### 1. Reception & Validation
- **Middleware**: The request passes through `cors` (to allow browser access) and `express.json()`.
- **Validation**: The server uses **Zod** to check if `userId`, `sessionId`, and `q` (the question) are present and valid. If they aren't, it immediately returns a `400 Bad Request` error.

### 2. Session Preparation
- The server checks if a session already exists for that `userId` and `sessionId`.
- If it doesn't exist, it automatically creates one in memory.

### 3. SSE Setup
- The server sets specific HTTP headers to tell the browser: *"Keep this connection open, I'm going to send you multiple messages over time."*
- It sends a "retry" instruction and starts a "keepalive" timer (sending a small `: keepalive` message every 15 seconds) to prevent the connection from timing out.

### 4. Runner Execution
- An instance of the `Runner` (from `@google/adk`) is created.
- The `Runner` is given:
  - The `courseCreator` agent (the "brain" that knows how to build courses).
  - The `sessionService` (to remember previous messages).
  - The user's new message.

### 5. The Streaming Loop
- The server uses an `async for` loop to listen to events from the AI.
- For every piece of information the AI generates (text, tool calls, or final results):
  1. The server extracts the content (`author`, `text`, etc.).
  2. It peeks into the session state to see if there's any special `judge_output` (from the AI's internal reasoning).
  3. It "pushes" this data to the client as a JSON string prefixed with `data: `.

### 6. Completion or Interruption
- **Success**: When the AI finishes, the loop ends, and the server closes the connection (`res.end()`).
- **User Abort**: If the user closes their browser or cancels the request, the server detects the `close` event, stops the AI runner, and cleans up the keepalive timer.
- **Error**: If anything fails, an error event is sent to the client, and the connection is closed.

---

## 💡 Interesting Concepts for newcomers

### What is SSE (Server-Sent Events)?
Unlike a normal request where you ask a question and wait for one answer, SSE is like a one-way radio. You tune in (open the connection), and the server broadcasts messages to you as they happen. This is why you see the AI's response appear word-by-word or step-by-step.

### What is "In-Memory" Session Service?
Currently, sessions are stored in the server's RAM (`InMemorySessionService`). 
- **Pros**: Very fast.
- **Cons**: If the server restarts, all sessions are lost. In a real production environment, we would likely swap this for a database like Redis or PostgreSQL.

### Why Zod?
We use Zod for "Type Safety at the Edge." Even though we use TypeScript, TypeScript only checks our code at compile time. Zod checks the *actual data* coming from the outside world (the user's request) at runtime to make sure it won't crash our app.

**Wait, what limits are enforced?**
- `userId` & `sessionId`: Must be between 1 and 128 characters.
- `q` (The question): Must be between 1 and 2,000 characters.

If the client sends anything outside these ranges, the API will return a `400 Bad Request`.

### What is the `reqId`?
Every request gets a short, unique ID (like `8a2f1`). This is included in logs and responses. If a user reports an error, we can search our server logs for that specific `reqId` to see exactly what went wrong for them.

---

## 🛠️ Development Guide

### Running the API
To start the server in development mode (with auto-transpilation of TypeScript):
```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

### Running Tests
To run the automated tests (located in `src/schemas.test.ts`):
```bash
npm test
```

### Environment Variables
The server expects a `.env` file (usually in the root of the project). It specifically looks for `GEMINI_API_KEY` to talk to the AI agents.
