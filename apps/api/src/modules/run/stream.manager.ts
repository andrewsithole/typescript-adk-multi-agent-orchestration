import { singleton, inject } from 'tsyringe';
import { InMemorySessionService as SessionService } from '@google/adk';
import { CONFIG } from '../../core/config.js';
import { Logger } from '../../core/logger.js';

@singleton()
export class StreamManager {
    private activeStreams = new Set<string>();
    private sessionIndex = new Map<string, { userId: string; sessionId: string; lastSeen: number }>();

    constructor(
        @inject(Logger) private log: Logger
    ) {
        this.startEvictionTimer();
    }

    public isActive(userId: string, sessionId: string): boolean {
        return this.activeStreams.has(`${userId}:${sessionId}`);
    }

    public addStream(userId: string, sessionId: string) {
        const key = `${userId}:${sessionId}`;
        this.activeStreams.add(key);
        this.sessionIndex.set(key, { userId, sessionId, lastSeen: Date.now() });
    }

    public removeStream(userId: string, sessionId: string) {
        this.activeStreams.delete(`${userId}:${sessionId}`);
    }

    public updateLastSeen(userId: string, sessionId: string) {
        const key = `${userId}:${sessionId}`;
        const meta = this.sessionIndex.get(key);
        if (meta) {
            meta.lastSeen = Date.now();
        }
    }

    public removeSession(userId: string, sessionId: string) {
        const key = `${userId}:${sessionId}`;
        this.activeStreams.delete(key);
        this.sessionIndex.delete(key);
    }

    private startEvictionTimer() {
        // Need SessionService for eviction, but can't inject it here easily without circularity or we just use the container
        // Actually, we can just use the eviction logic here and resolve SessionService when needed
        setInterval(async () => {
            const { container } = await import('../../core/container.js');
            const sessionService = container.resolve('SessionService') as SessionService;
            
            const now = Date.now();
            for (const [key, meta] of this.sessionIndex) {
                if (now - meta.lastSeen > CONFIG.SESSION_TTL_MS) {
                    try {
                        await sessionService.deleteSession({ appName: CONFIG.APP_NAME, userId: meta.userId, sessionId: meta.sessionId });
                        this.log.info('session evicted (ttl)', { userId: meta.userId, sessionId: meta.sessionId });
                    } catch (err) {
                        this.log.warn('failed to evict session', { userId: meta.userId, sessionId: meta.sessionId, error: (err as Error).message });
                    } finally {
                        this.sessionIndex.delete(key);
                    }
                }
            }
        }, 5 * 60_000).unref?.();
    }
}
