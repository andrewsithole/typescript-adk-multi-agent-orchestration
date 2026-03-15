// apps/api/src/server.ts
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import { Runner, InMemorySessionService, stringifyContent, getFunctionCalls, getFunctionResponses } from '@google/adk';

// Import the orchestrated agent colocated with the API.
import { hypeSquadCreator } from './agents/orchestrator.js';

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
    await sessionService.createSession({ appName, userId, sessionId: sessionId || '' });
    res.status(204).end();
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
  try {
    const parsed = RunStreamQuery.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, 'invalid_request', parsed.error.message, reqId);
    }
    const { userId, sessionId, q } = parsed.data;

    // eslint-disable-next-line no-console
    console.log(`[${reqId}] stream start`, { userId, sessionId });

    // Ensure a session exists (Strict production pattern)
    const existing = await sessionService.getSession({ appName, userId, sessionId });
    if (!existing) {
      return sendError(res, 404, 'session_not_found', `Session ${sessionId} not found for user ${userId}. Please create a session first via POST /api/sessions.`, reqId);
    }

    const runner = new Runner({ appName, agent: hypeSquadCreator, sessionService });

    // SSE headers (same-origin; no CORS/credentials needed)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
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

    // Accumulated outputs — updated from each event's stateDelta as it flows through.
    // This avoids a round-trip getSession call and the stale-state problem that arises
    // because InMemorySessionService.getSession clones the stored session, which is only
    // updated when appendEvent is called on the *stored* copy — not on the runner's
    // in-memory copy.
    let accJudgeOutput: string | undefined;
    let accTwitterOutput: string | undefined;
    let accLinkedinOutput: string | undefined;

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

        // Capture outputs from stateDelta as they arrive — before any suppress logic.
        const delta = event.actions?.stateDelta as Record<string, unknown> | undefined;
        if (delta) {
          const getVal = (val: any) => {
            if (!val) return undefined;
            if (typeof val === 'string') return val;
            return stringifyContent(val);
          };
          if (delta['judge_output']) accJudgeOutput = getVal(delta['judge_output']);
          if (delta['twitter_output']) accTwitterOutput = getVal(delta['twitter_output']);
          if (delta['linkedin_output']) accLinkedinOutput = getVal(delta['linkedin_output']);
        }

        const text = stringifyContent(event);
        const author = event.author ?? 'system';
        const calls = getFunctionCalls(event) || [];
        const responses = getFunctionResponses(event) || [];
        const escalate = Boolean(event.actions?.escalate);

        // Inner agents (researcher, judge, etc.) are wrapped by ProgressWrapper which
        // emits its own progress messages. Suppress their raw LLM text here but
        // still forward tool calls so the UI can show search activity.
        // NOTE: We allow formatters (thread_whiz, the_professional) to pass through
        // so the UI can capture their text directly if session state is delayed.
        const SUPPRESS_TEXT_FROM = new Set(['researcher', 'judge']);
        if (SUPPRESS_TEXT_FROM.has(author) && calls.length === 0 && responses.length === 0 && !escalate) {
          continue;
        }

        send({ author, text, calls: calls.map(c => c.name), responses: responses.map(r => r.name), escalate, judge_output: accJudgeOutput, twitter_output: accTwitterOutput, linkedin_output: accLinkedinOutput, reqId });
        eventCount++;
      }
    } catch (streamErr) {
      reason = 'error';
      send({ error: (streamErr as Error).message, code: 'stream_error', reqId });
    } finally {
      clearInterval(ping);

      // Fallback: if we didn't capture outputs via stateDelta during the stream,
      // try to read the latest session snapshot to avoid missing final content.
      try {
        if (!accJudgeOutput || !accTwitterOutput || !accLinkedinOutput) {
          const latest = await sessionService.getSession({ appName, userId, sessionId });
          const st = latest?.state as Record<string, unknown> | undefined;
          const getVal = (val: any) => {
            if (!val) return undefined;
            if (typeof val === 'string') return val;
            return stringifyContent(val);
          };
          if (!accJudgeOutput && st && st['judge_output']) accJudgeOutput = getVal(st['judge_output']);
          if (!accTwitterOutput && st && st['twitter_output']) accTwitterOutput = getVal(st['twitter_output']);
          if (!accLinkedinOutput && st && st['linkedin_output']) accLinkedinOutput = getVal(st['linkedin_output']);
        }
      } catch {
        // Ignore snapshot fallback errors; we'll still end the stream gracefully.
      }

      // Send final snapshot of any accumulated outputs.
      if (accJudgeOutput || accTwitterOutput || accLinkedinOutput) {
        send({ author: 'system', text: 'done', judge_output: accJudgeOutput, twitter_output: accTwitterOutput, linkedin_output: accLinkedinOutput, done: true, reqId });
        eventCount++;
      }
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
