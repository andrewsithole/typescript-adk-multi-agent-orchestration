// apps/api/src/server.ts
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { Runner, InMemorySessionService, stringifyContent, getFunctionCalls, getFunctionResponses } from '@google/adk';

// Import the orchestrated agent from the existing codebase.
// Using NodeNext, we need explicit .js extensions in TS source.
// We rely on ts-node/esm in dev to transpile TS on the fly.
// If you later build to JS, update this import to point to the built file.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { courseCreator } from '../../agents/orchestrator.js';

import { SessionCreateBody, RunStreamQuery } from './schemas.js';
import { randomUUID } from 'node:crypto';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env'), override: false });

// Normalize API key env var across expected names for @google/genai/@google/adk
(() => {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    if (!process.env.GOOGLE_GENAI_API_KEY) process.env.GOOGLE_GENAI_API_KEY = key;
    if (!process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = key;
  }
})();

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const appName = process.env.APP_NAME || 'ts-multi-agents';

app.use(cors({ origin: true }));
app.use(express.json());

// Shared in-memory session service for this process
const sessionService = new InMemorySessionService();

const sendError = (res: express.Response, status: number, code: string, message: string, reqId?: string) => {
  return res.status(status).json({ error: message, code, reqId });
};

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

app.post('/api/sessions', async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID().split('-')[0]);
  try {
    const parsed = SessionCreateBody.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'invalid_request', parsed.error.message, reqId);
    }
    const { userId, sessionId } = parsed.data;
    const session = await sessionService.createSession({ appName, userId, sessionId:sessionId||"" });
    res.json({ id: session.id, userId: session.userId, appName: session.appName, reqId });
  } catch (err) {
    sendError(res, 500, 'internal_error', (err as Error).message, reqId);
  }
});

app.get('/api/run/stream', async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID().split('-')[0]);
  let aborted = false;
  let eventCount = 0;
  let reason: 'completed' | 'aborted' | 'error' = 'completed';

  // Debug log (don't log the full key)
  // eslint-disable-next-line no-console
  console.log(`[${reqId}] check key:`, { hasGeminiKey: !!process.env.GEMINI_API_KEY });

  try {
    const parsed = RunStreamQuery.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, 'invalid_request', parsed.error.message, reqId);
    }
    const { userId, sessionId, q } = parsed.data;

    // eslint-disable-next-line no-console
    console.log(`[${reqId}] stream start`, { userId, sessionId });

    // Ensure a session exists
    const existing = await sessionService.getSession({ appName, userId, sessionId });
    if (!existing) {
      await sessionService.createSession({ appName, userId, sessionId });
    }

    const runner = new Runner({ appName, agent: courseCreator, sessionService });

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    // Preamble
    res.write('retry: 5000\n\n');

    const send = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // keepalive
    const ping = setInterval(() => res.write(': keepalive\n\n'), 15000);

    req.on('close', () => {
      aborted = true;
      clearInterval(ping);
    });

    // Stream runner events
    try {
      for await (const event of runner.runAsync({
        userId,
        sessionId,
        newMessage: { role: 'user', parts: [{ text: q }] },
      })) {
        if (aborted) {
          reason = 'aborted';
          // eslint-disable-next-line no-console
          console.log(`[${reqId}] stream stopped (aborted)`);
          break;
        }

        const text = stringifyContent(event);
        const author = event.author ?? 'system';
        const calls = getFunctionCalls(event) || [];
        const responses = getFunctionResponses(event) || [];
        const escalate = Boolean(event.actions?.escalate);

        // Load session to peek judge_output if present
        let judge_output: unknown | undefined;
        try {
          const session = await sessionService.getSession({ appName, userId, sessionId });
          judge_output = session?.state?.['judge_output'];
        } catch {
          // ignore
        }

        send({ author, text, calls: calls.map(c => c.name), responses: responses.map(r => r.name), escalate, judge_output, reqId });
        eventCount++;
      }
    } catch (streamErr) {
      reason = 'error';
      send({ error: (streamErr as Error).message, code: 'stream_error', reqId });
    } finally {
      clearInterval(ping);
      // eslint-disable-next-line no-console
      console.log(`[${reqId}] stream end`, { eventCount, reason });
      res.end();
    }
  } catch (err) {
    sendError(res, 500, 'internal_error', (err as Error).message, reqId);
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
  // eslint-disable-next-line no-console
  console.log('Environment variables check:', {
    cwd: process.cwd(),
    hasGoogleApiKey: !!process.env.GOOGLE_GENAI_API_KEY,
    hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
  });
});
