import { type Request, type Response, type NextFunction } from 'express';
import { AppError } from './AppError.js';
import { container } from '../core/container.js';
import { Logger } from '../core/logger.js';
import { ZodError } from 'zod';

export const errorHandler = (
    err: Error | AppError | ZodError,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const logger = container.resolve(Logger);
    const reqId = String(req.headers['x-request-id'] || '');

    if (err instanceof AppError) {
        logger.warn(`AppError: ${err.message}`, { 
            statusCode: err.statusCode, 
            code: err.code, 
            reqId,
            url: req.url 
        });
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            reqId
        });
    }

    if (err instanceof ZodError) {
        logger.warn(`ValidationError: ${err.message}`, { reqId, url: req.url });
        return res.status(400).json({
            error: 'Validation failed',
            details: err.issues,
            code: 'invalid_request',
            reqId
        });
    }

    // Unhandled errors
    logger.error(`UnhandledError: ${err.message}`, { 
        stack: err.stack, 
        reqId,
        url: req.url 
    });

    return res.status(500).json({
        error: 'Internal server error',
        code: 'internal_error',
        reqId
    });
};
