import { type Request, type Response, type NextFunction } from 'express';
import { CONFIG } from '../../core/config.js';

const hits = new Map<string, { count: number; resetAt: number }>();

const limit = (key: string, max: number) => {
    const now = Date.now();
    const rec = hits.get(key);
    if (!rec || now >= rec.resetAt) {
        hits.set(key, { count: 1, resetAt: now + CONFIG.RATE_LIMIT.WINDOW_MS });
        return true;
    }
    if (rec.count >= max) return false;
    rec.count++;
    return true;
};

export const rateLimit = (maxPerMin: number) => (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || (req.connection as any).remoteAddress || 'unknown';
    const ok = limit(`${ip}:${req.path}`, maxPerMin);
    if (!ok) {
        // We'll let the global error handler handle this if we throw or just send direct
        // For now, let's just send direct to maintain behavior or throw AppError
        return res.status(429).json({
            error: 'Too many requests, slow down.',
            code: 'rate_limited',
            reqId: String(req.headers['x-request-id'] || '')
        });
    }
    next();
};
