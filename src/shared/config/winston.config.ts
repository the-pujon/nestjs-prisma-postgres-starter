import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

// Check if Loki is available
const lokiEnabled = process.env.LOKI_ENABLED !== 'false';
const lokiHost =
  process.env.LOKI_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://loki:3100'
    : 'http://localhost:3100');

const transports: winston.transport[] = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, trace }) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-base-to-string
        return `${timestamp} [${context || 'Application'}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
      }),
    ),
  }),
];

// Only add Loki transport if enabled and not explicitly disabled
if (lokiEnabled) {
  try {
    transports.push(
      new LokiTransport({
        host: lokiHost,
        labels: {
          app: 'nestjs-app',
          environment: process.env.NODE_ENV || 'development',
        },
        json: true,
        format: winston.format.json(),
        replaceTimestamp: true,
        onConnectionError: (err) => {
          // Silently log connection errors to avoid spam
          if (process.env.NODE_ENV === 'development') {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            console.error('Loki connection error:', errorMessage);
          }
        },
      }),
    );
  } catch (error) {
    console.warn('Failed to initialize Loki transport:', error);
  }
}

export const winstonConfig: WinstonModuleOptions = {
  transports,
  level: process.env.LOG_LEVEL || 'info',
  exitOnError: false,
};
