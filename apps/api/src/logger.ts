import dotenv from 'dotenv';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const { combine, colorize, timestamp, printf, json } = winston.format;

const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    printf(({ level, message, timestamp: ts, context, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${ts} ${level} [${context}] ${message}${metaStr}`;
    })
);

const transports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat }),
];

if (process.env.LOG_FILE === 'true') {
    transports.push(
        new DailyRotateFile({
            filename: 'logs/%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d',
        })
    );
}

const root = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports,
});

export function createLogger(context: string) {
    return root.child({ context });
}
