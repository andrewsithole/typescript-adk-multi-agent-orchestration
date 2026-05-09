import { type Request, type Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { InMemorySessionService as SessionService } from '@google/adk';
import { CONFIG } from '../../core/config.js';
import { SessionCreateBody } from '../../schemas.js';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../errors/AppError.js';
import { Logger } from '../../core/logger.js';

@injectable()
export class SessionController {
    constructor(
        @inject('SessionService') private sessionService: SessionService,
        @inject(Logger) private log: Logger
    ) {}

    async listSessions(req: Request, res: Response) {
        const reqId = String(req.headers['x-request-id'] || randomUUID());
        const userId = String(req.params.userId || '').trim();
        
        if (!userId) {
            throw new AppError('userId is required', 400, 'invalid_request');
        }

        const list = await this.sessionService.listSessions({ appName: CONFIG.APP_NAME, userId });
        const sessions = (list.sessions || []).map(s => ({ id: s.id, lastUpdateTime: s.lastUpdateTime }));
        
        res.setHeader('X-Request-Id', reqId);
        res.status(200).json({ sessions });
    }

    async deleteSession(req: Request, res: Response) {
        const reqId = String(req.headers['x-request-id'] || randomUUID());
        const userId = String(req.params.userId || '').trim();
        const sessionId = String(req.params.sessionId || '').trim();

        if (!userId || !sessionId) {
            throw new AppError('userId and sessionId are required', 400, 'invalid_request');
        }

        await this.sessionService.deleteSession({ appName: CONFIG.APP_NAME, userId, sessionId });
        
        res.setHeader('X-Request-Id', reqId);
        res.status(204).end();
    }

    async createSession(req: Request, res: Response) {
        const reqId = String(req.headers['x-request-id'] || randomUUID());
        const parsed = SessionCreateBody.safeParse(req.body);
        
        if (!parsed.success) {
            throw new AppError(parsed.error.message, 400, 'invalid_request');
        }

        const { userId, sessionId } = parsed.data;
        const session = await this.sessionService.createSession({ appName: CONFIG.APP_NAME, userId, sessionId });
        
        res.setHeader('X-Request-Id', reqId);
        res.status(201).json({ sessionId: session.id });
    }
}
