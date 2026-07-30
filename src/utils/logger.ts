import winston from 'winston';
import path from 'path';
import { env } from '@config/env';

/**
 * Winston structured logger.
 * Outputs pretty logs to console in development, and structured JSON logs to files in production.
 */

// Define log levels matching syslog
const levels = {
  error: 0,
  warn:  1,
  info:  2,
  debug: 3,
};

// Define log colors for development console
const colors = {
  error: 'red',
  warn:  'yellow',
  info:  'green',
  debug: 'blue',
};

winston.addColors(colors);

// Log level determined from env config
const level = env.LOG_LEVEL;

// Formatter for development console output (colourised and formatted)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`,
  ),
);

// Formatter for production file outputs (JSON format for log aggregators)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

// Define transports (targets) for writing logs
const transports: winston.transport[] = [];

if (env.NODE_ENV === 'production') {
  // Ensure logs directory exists (handled by winston automatically)
  const logDir = env.LOG_DIR;

  transports.push(
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: prodFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: prodFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
    }),
  );
} else {
  // Always output to console in development
  transports.push(
    new winston.transports.Console({
      format: devFormat,
    }),
  );
}

// Create the logger instance
export const logger = winston.createLogger({
  level,
  levels,
  transports,
});
