import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import { Runner, InMemorySessionService, stringifyContent, getFunctionCalls, getFunctionResponses } from '@google/adk';

// Import the orchestrated agent colocated with the API.
import { hypeSquadCreator } from './agents/orchestrator.js';

import { SessionCreateBody, RunStreamQuery } from './schemas.js';
import { randomUUID } from 'node:crypto';
import { createLogger } from './logger.js';

const log = createLogger('server');

// Load .env from repo root to support running from apps/api
dotenv.config({ path: path.resolve(process.cwd(), '../../.env'), override: false });

// Normalize API key env var across expected names for @google/genai/@google/adk
const normalizeApiKey = () => {
  const cand = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GENAI_API_KEY;
  if (!cand) return;
  if (!process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = cand;
  if (!process.env.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = cand;
};
normalizeApiKey();
const app = express();
app.disable('x-powered-by');
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const appName = process.env.APP_NAME || 'ts-multi-agents';

// Tighten JSON body size to reduce abuse surface.
app.use(express.json({ limit: '32kb' }));

// Minimal security headers (POC-friendly; consider helmet for production)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Shared in-memory session service for this process
const sessionService = new InMemorySessionService();

// Helper to coerce stateDelta values to string consistently
const toStringVal = (val: any): string | undefined => {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  return stringifyContent(val as any);
};

// Simple in-memory rate limiter and active stream guard
type RateKey = string; // ip:path or user:session for streams
const hits = new Map<RateKey, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const limit = (key: RateKey, max: number) => {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now >= rec.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (rec.count >= max) return false;
  rec.count++;
  return true;
};

const rateLimit = (maxPerMin: number) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || (req.connection as any).remoteAddress || 'unknown';
  const ok = limit(`${ip}:${req.path}`, maxPerMin);
  if (!ok) return sendError(res, 429, 'rate_limited', 'Too many requests, slow down.', String(req.headers['x-request-id']));
  next();
};

// Track sessions for TTL cleanup and prevent concurrent duplicate streams per session
const activeStreams = new Set<string>();
const sessionIndex = new Map<string, { userId: string; sessionId: string; lastSeen: number }>();
const SESSION_TTL_MS = 30 * 60_000; // 30 minutes
setInterval(async () => {
  const now = Date.now();
  for (const [key, meta] of sessionIndex) {
    if (now - meta.lastSeen > SESSION_TTL_MS) {
      try {
        await sessionService.deleteSession({ appName, userId: meta.userId, sessionId: meta.sessionId });
        log.info('session evicted (ttl)', { userId: meta.userId, sessionId: meta.sessionId });
      } catch (err) {
        log.warn('failed to evict session', { userId: meta.userId, sessionId: meta.sessionId, error: (err as Error).message });
      } finally {
        sessionIndex.delete(key);
      }
    }
  }
}, 5 * 60_000).unref?.();

const sendError = (res: express.Response, status: number, code: string, message: string, reqId?: string) => {
  const safeMessage = status >= 500 ? 'Internal error' : message;
  return res.status(status).json({ error: safeMessage, code, reqId });
};

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

// List sessions for a user (ids and timestamps only)
app.get('/api/sessions/:userId', rateLimit(20), async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID());
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return sendError(res, 400, 'invalid_request', 'userId is required', reqId);
    const list = await sessionService.listSessions({ appName, userId });
    const sessions = (list.sessions || []).map(s => ({ id: s.id, lastUpdateTime: s.lastUpdateTime }));
    res.setHeader('X-Request-Id', reqId);
    res.status(200).json({ sessions });
  } catch (err) {
    log.error('sessions list failed', { reqId, error: (err as Error).message });
    sendError(res, 500, 'internal_error', 'internal', reqId);
  }
});

// Delete a specific session
app.delete('/api/sessions/:userId/:sessionId', rateLimit(20), async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID());
  try {
    const userId = String(req.params.userId || '').trim();
    const sessionId = String(req.params.sessionId || '').trim();
    if (!userId || !sessionId) return sendError(res, 400, 'invalid_request', 'userId and sessionId are required', reqId);
    await sessionService.deleteSession({ appName, userId, sessionId });
    activeStreams.delete(`${userId}:${sessionId}`);
    sessionIndex.delete(`${userId}:${sessionId}`);
    res.setHeader('X-Request-Id', reqId);
    res.status(204).end();
  } catch (err) {
    log.error('session delete failed', { reqId, error: (err as Error).message });
    sendError(res, 500, 'internal_error', 'internal', reqId);
  }
});

app.post('/api/sessions', rateLimit(20), async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID());
  try {
    const parsed = SessionCreateBody.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'invalid_request', parsed.error.message, reqId);
    }
    const { userId, sessionId } = parsed.data;
    const session = await sessionService.createSession({ appName, userId, sessionId });
    const key = `${userId}:${session.id}`;
    sessionIndex.set(key, { userId, sessionId: session.id, lastSeen: Date.now() });
    res.setHeader('X-Request-Id', reqId);
    res.status(201).json({ sessionId: session.id });
  } catch (err) {
    log.error('session create failed', { reqId, error: (err as Error).message });
    sendError(res, 500, 'internal_error', 'internal', reqId);
  }
});

app.get('/api/run/stream', rateLimit(12), async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID());
  let aborted = false;
  let eventCount = 0;
  let reason: 'completed' | 'aborted' | 'error' = 'completed';

  try {
    const parsed = RunStreamQuery.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, 'invalid_request', parsed.error.message, reqId);
    }
    const { userId, sessionId } = parsed.data;
    const q = parsed.data.q.trim();
    const maxIterationsParam = parsed.data.maxIterations;
    const maxLlmCalls = typeof maxIterationsParam === 'number' && Number.isFinite(maxIterationsParam)
      ? Math.min(Math.max(maxIterationsParam, 1), 100)
      : undefined;

    // Enforce Accept header for SSE
    const accept = String(req.headers['accept'] || '');
    if (!accept.includes('text/event-stream')) {
      return sendError(res, 406, 'not_acceptable', 'Client must accept text/event-stream.', reqId);
    }

    log.info('stream start', { reqId, userId, sessionId });

    // Ensure a session exists (Strict production pattern)
    const existing = await sessionService.getSession({ appName, userId, sessionId });
    if (!existing) {
      return sendError(res, 404, 'session_not_found', `Session ${sessionId} not found for user ${userId}. Please create a session first via POST /api/sessions.`, reqId);
    }

    const runner = new Runner({ appName, agent: hypeSquadCreator, sessionService });

    // Prevent concurrent duplicate streams per (user, session)
    const streamKey = `${userId}:${sessionId}`;
    if (activeStreams.has(streamKey)) {
      return sendError(res, 409, 'stream_exists', 'A stream is already active for this session.', reqId);
    }
    activeStreams.add(streamKey);
    sessionIndex.set(streamKey, { userId, sessionId, lastSeen: Date.now() });

    // SSE headers (same-origin; no CORS/credentials needed)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Request-Id': reqId,
    });
    (res as any).flushHeaders?.();

    // Preamble
    res.write('retry: 5000\n\n');

    const sendEvent = (name: string, payload: unknown) => {
      res.write(`event: ${name}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
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
      const runConfig = maxLlmCalls ? { maxLlmCalls } : undefined;
      const runArgs: any = { userId, sessionId, newMessage: { role: 'user', parts: [{ text: q }] } };
      if (runConfig) runArgs.runConfig = runConfig;
      for await (const event of runner.runAsync(runArgs)) {
        if (aborted) {
          reason = 'aborted';
          log.info('stream stopped (aborted)', { reqId });
          break;
        }

        // Capture outputs from stateDelta as they arrive — before any suppress logic.
        const delta = event.actions?.stateDelta as Record<string, unknown> | undefined;
        let deltaUpdate = false;
        if (delta) {
          if (delta['judge_output']) { accJudgeOutput = toStringVal(delta['judge_output']); deltaUpdate = true; }
          if (delta['twitter_output']) { accTwitterOutput = toStringVal(delta['twitter_output']); deltaUpdate = true; }
          if (delta['linkedin_output']) { accLinkedinOutput = toStringVal(delta['linkedin_output']); deltaUpdate = true; }
        }

        const text = stringifyContent(event);
        const author = event.author ?? 'system';
        const calls = getFunctionCalls(event) || [];
        const responses = getFunctionResponses(event) || [];
        const escalate = Boolean(event.actions?.escalate);

        // Suppress raw LLM text from the research/evaluation agents since they are wrapped by ProgressWrapper.
        // We allow ':progress' messages to pass through to the activity log.
        const SUPPRESS_TEXT_FROM = new Set(['researcher', 'researcher_search', 'researcher_scrape', 'researcher_process', 'judge']);
        const isProgress = author.endsWith('_progress');
        if (!isProgress && SUPPRESS_TEXT_FROM.has(author) && calls.length === 0 && responses.length === 0 && !escalate && !deltaUpdate) {
          continue;
        }

        sendEvent('progress', { author, text, calls: calls.map(c => c.name), responses: responses.map(r => r.name), escalate, judge_output: accJudgeOutput, twitter_output: accTwitterOutput, linkedin_output: accLinkedinOutput, reqId });
        eventCount++;
      }
    } catch (streamErr) {
      reason = 'error';
      log.error('stream error', { reqId, error: (streamErr as Error).message });
      sendEvent('error', { error: 'Stream error', code: 'stream_error', reqId });
    } finally {
      clearInterval(ping);

      // Fallback: if we didn't capture outputs via stateDelta during the stream,
      // try to read the latest session snapshot to avoid missing final content.
      try {
        if (!accJudgeOutput || !accTwitterOutput || !accLinkedinOutput) {
          const latest = await sessionService.getSession({ appName, userId, sessionId });
          const st = latest?.state as Record<string, unknown> | undefined;
          if (!accJudgeOutput && st && st['judge_output']) accJudgeOutput = toStringVal(st['judge_output']);
          if (!accTwitterOutput && st && st['twitter_output']) accTwitterOutput = toStringVal(st['twitter_output']);
          if (!accLinkedinOutput && st && st['linkedin_output']) accLinkedinOutput = toStringVal(st['linkedin_output']);
        }
      } catch {
        // Ignore snapshot fallback errors; we'll still end the stream gracefully.
      }

      // Send final snapshot of any accumulated outputs.
      if (accJudgeOutput || accTwitterOutput || accLinkedinOutput) {
        sendEvent('final', { author: 'system', text: 'done', judge_output: accJudgeOutput, twitter_output: accTwitterOutput, linkedin_output: accLinkedinOutput, done: true, reqId });
        eventCount++;
      }
      activeStreams.delete(streamKey);
      log.info('stream end', { reqId, eventCount, reason });
      res.end();
    }
  } catch (err) {
    console.error(err);
    log.error('run/stream failed', { reqId, error: (err as Error).message });
    sendError(res, 500, 'internal_error', 'internal', reqId);
  }
});

// Probe endpoint to check if a stream is already active for a session
app.get('/api/run/probe', rateLimit(30), async (req, res) => {
  const reqId = String(req.headers['x-request-id'] || randomUUID());
  try {
    const parsed = RunStreamQuery.safeParse(req.query);
    if (!parsed.success) {
      return sendError(res, 400, 'invalid_request', parsed.error.message, reqId);
    }
    const { userId, sessionId } = parsed.data;
    const streamKey = `${userId}:${sessionId}`;
    if (activeStreams.has(streamKey)) {
      return sendError(res, 409, 'stream_exists', 'A stream is already active for this session.', reqId);
    }
    // Also ensure session exists
    const existing = await sessionService.getSession({ appName, userId, sessionId });
    if (!existing) {
      return sendError(res, 404, 'session_not_found', `Session ${sessionId} not found for user ${userId}.`, reqId);
    }
    res.setHeader('X-Request-Id', reqId);
    res.status(204).end();
  } catch (err) {
    log.error('run/probe failed', { reqId, error: (err as Error).message });
    sendError(res, 500, 'internal_error', 'internal', reqId);
  }
});

app.listen(port, () => {
  log.info(`API listening on :${port}`);
  log.debug('Environment variables check', {
    cwd: process.cwd(),
    hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
  });
});
