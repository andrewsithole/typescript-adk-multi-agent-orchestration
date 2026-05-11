import express from 'express';
import { injectable, inject } from 'tsyringe';
import { CONFIG } from './core/config.js';
import { Logger } from './core/logger.js';
import sessionRoutes from './modules/session/session.routes.js';
import runRoutes from './modules/run/run.routes.js';
import { errorHandler } from './errors/errorHandler.js';

@injectable()
export class Server {
    private app: express.Application;

    constructor(@inject(Logger) private log: Logger) {
        this.app = express();
        this.setupEnvironment();
        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupEnvironment() {
        // Normalize API key env var (dotenv already loaded in index.ts)
        const cand = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GENAI_API_KEY;
        if (cand) {
            if (!process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = cand;
            if (!process.env.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = cand;
        }
    }

    private setupMiddlewares() {
        this.app.disable('x-powered-by');
        this.app.use(express.json({ limit: CONFIG.JSON_BODY_LIMIT }));

        // Minimal security headers
        this.app.use((_req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            next();
        });
    }

    private setupRoutes() {
        this.app.get('/healthz', (_req, res) => {
            res.status(200).send('ok');
        });

        this.app.use('/api/sessions', sessionRoutes);
        this.app.use('/api/run', runRoutes);
    }

    private setupErrorHandling() {
        this.app.use(errorHandler);
    }

    public listen() {
        this.app.listen(CONFIG.PORT, () => {
            this.log.info(`API listening on :${CONFIG.PORT}`);
        });
    }
}
