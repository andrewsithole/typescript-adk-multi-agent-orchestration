import 'reflect-metadata';
import dotenv from 'dotenv';
import path from 'node:path';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { singleton } from 'tsyringe';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const { combine, colorize, timestamp, printf } = winston.format;

const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    printf(({ level, message, timestamp: ts, context, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${ts} ${level} [${context || 'system'}] ${message}${metaStr}`;
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
            format: combine(
                timestamp(),
                printf(({ timestamp: ts, level, message, ...meta }) =>
                    JSON.stringify({ timestamp: ts, level, message, ...meta })
                )
            ),
            maxFiles: '14d',
        })
    );
}

const root = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports,
});

@singleton()
export class Logger {
    private logger = root;

    public info(message: string, meta?: any) {
        this.logger.info(message, meta);
    }

    public error(message: string, meta?: any) {
        this.logger.error(message, meta);
    }

    public warn(message: string, meta?: any) {
        this.logger.warn(message, meta);
    }

    public debug(message: string, meta?: any) {
        this.logger.debug(message, meta);
    }

    public child(context: string) {
        return root.child({ context });
    }
}

export function createLogger(context: string) {
    return root.child({ context });
}
