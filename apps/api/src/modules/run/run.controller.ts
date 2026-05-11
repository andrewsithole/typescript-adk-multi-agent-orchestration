import { type Request, type Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { InMemorySessionService as SessionService } from '@google/adk';
import { CONFIG } from '../../core/config.js';
import { RunStreamQuery } from '../../schemas.js';
import { randomUUID } from 'node:crypto';
import { AgentService } from './agent.service.js';
import { StreamManager } from './stream.manager.js';
import { AppError } from '../../errors/AppError.js';
import { Logger } from '../../core/logger.js';

@injectable()
export class RunController {
    constructor(
        @inject(AgentService) private agentService: AgentService,
        @inject(StreamManager) private streamManager: StreamManager,
        @inject('SessionService') private sessionService: SessionService,
        @inject(Logger) private log: Logger
    ) {}

    async stream(req: Request, res: Response) {
        const reqId = String(req.headers['x-request-id'] || randomUUID());
        let aborted = false;

        const parsed = RunStreamQuery.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError(parsed.error.message, 400, 'invalid_request');
        }
        
        const { userId, sessionId, q, maxIterations } = parsed.data;

        const accept = String(req.headers['accept'] || '');
        if (!accept.includes('text/event-stream')) {
            throw new AppError('Client must accept text/event-stream.', 406, 'not_acceptable');
        }

        if (this.streamManager.isActive(userId, sessionId)) {
            throw new AppError('A stream is already active for this session.', 409, 'stream_exists');
        }

        const session = await this.sessionService.getSession({ appName: CONFIG.APP_NAME, userId, sessionId });
        if (!session) {
            throw new AppError(`Session ${sessionId} not found.`, 404, 'session_not_found');
        }

        this.streamManager.addStream(userId, sessionId);

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
            'X-Request-Id': reqId,
        });

        const sendSse = (event: string, data: any) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        res.write('retry: 5000\n\n');
        const ping = setInterval(() => res.write(': keepalive\n\n'), 15000);

        req.on('close', () => {
            aborted = true;
            clearInterval(ping);
            this.streamManager.removeStream(userId, sessionId);
        });

        try {
            const stream = this.agentService.runStream({
                userId,
                sessionId,
                query: q,
                maxLlmCalls: maxIterations || CONFIG.RESEARCH_LOOP_MAX,
                reqId
            });

            for await (const data of stream) {
                if (aborted) break;
                sendSse(data.done ? 'final' : 'progress', data);
            }
        } catch (err) {
            this.log.error('stream processing failed', { reqId, error: (err as Error).message });
            sendSse('error', { error: 'Stream error', code: 'stream_error', reqId });
        } finally {
            clearInterval(ping);
            this.streamManager.removeStream(userId, sessionId);
            res.end();
        }
    }

    async probe(req: Request, res: Response) {
        const reqId = String(req.headers['x-request-id'] || randomUUID());
        const parsed = RunStreamQuery.safeParse(req.query);
        if (!parsed.success) {
            throw new AppError(parsed.error.message, 400, 'invalid_request');
        }

        const { userId, sessionId } = parsed.data;
        if (this.streamManager.isActive(userId, sessionId)) {
            throw new AppError('A stream is already active for this session.', 409, 'stream_exists');
        }

        const existing = await this.sessionService.getSession({ appName: CONFIG.APP_NAME, userId, sessionId });
        if (!existing) {
            throw new AppError(`Session ${sessionId} not found for user ${userId}.`, 404, 'session_not_found');
        }

        res.setHeader('X-Request-Id', reqId);
        res.status(204).end();
    }
}
