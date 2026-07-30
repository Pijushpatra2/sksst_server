import morgan, { StreamOptions } from 'morgan';
import { env } from '@config/env';

/**
 * HTTP request logger middleware using morgan.
 *
 * Development: 'dev' format — colourised, concise  (GET /api/health 200 3ms)
 * Production:  'combined' format — Apache-style for log aggregation
 *
 * The requestId token is injected so every log line includes the request ID
 * for distributed tracing across PM2 workers.
 */

// Register a custom token to include the requestId from req
morgan.token('reqId', (req) => (req as Express.Request).requestId ?? '-');

// Build the format string
const devFormat  = ':method :url :status :response-time ms [:reqId]';
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" [:reqId]';

const format = env.NODE_ENV === 'production' ? prodFormat : devFormat;

// Stream options — write to stdout (PM2 captures this)
const stream: StreamOptions = {
  write: (message: string) => process.stdout.write(message),
};

export const httpLogger = morgan(format, { stream });
