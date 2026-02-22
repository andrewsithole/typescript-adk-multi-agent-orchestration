// apps/api/src/server.ts
import 'dotenv/config';
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

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const appName = process.env.APP_NAME || 'ts-multi-agents';

app.use(cors({ origin: true }));
app.use(express.json());

// Shared in-memory session service for this process
const sessionService = new InMemorySessionService();

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

app.post('/api/sessions', async (req, res) => {
  try {
    const { userId, sessionId } = req.body ?? {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const session = await sessionService.createSession({ appName, userId, sessionId });
    res.json({ id: session.id, userId: session.userId, appName: session.appName });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/run/stream', async (req, res) => {
  try {
    const userId = String(req.query.userId || 'user-1');
    const sessionId = String(req.query.sessionId || 'session-1');
    const q = String(req.query.q || 'Create a course on the history of Coffee.');

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

    const send = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // keepalive
    const ping = setInterval(() => res.write(':\n\n'), 15000);
    req.on('close', () => clearInterval(ping));

    // Stream runner events
    try {
      for await (const event of runner.runAsync({
        userId,
        sessionId,
        newMessage: { role: 'user', parts: [{ text: q }] },
      })) {
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

        send({ author, text, calls: calls.map(c => c.name), responses: responses.map(r => r.name), escalate, judge_output });
      }
    } catch (streamErr) {
      send({ error: (streamErr as Error).message });
    } finally {
      res.end();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
});

