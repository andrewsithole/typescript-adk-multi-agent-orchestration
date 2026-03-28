import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, colorize, timestamp, printf, json } = winston.format;

const consoleFormat = combine(
    colorize({ all: true }),
    timestamp({ format: 'HH:mm:ss' }),
    printf(({ level, message, timestamp: ts, context, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${ts} ${level} [${context}] ${message}${metaStr}`;
    })
);

export function createLogger(context: string) {
    const transports: winston.transport[] = [
        new winston.transports.Console({ format: consoleFormat }),
    ];

    if (process.env.LOG_FILE === 'true') {
        transports.push(
            new DailyRotateFile({
                filename: 'logs/%DATE%.log',
                datePattern: 'YYYY-MM-DD',
                format: json(),
                maxFiles: '14d',
            })
        );
    }

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        defaultMeta: { context },
        transports,
    });
}