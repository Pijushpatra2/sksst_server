import { CorsOptions } from 'cors';
import { env } from '@config/env';

/**
 * CORS policy configuration.
 * Allowed origins are loaded from CORS_ORIGINS env var (comma-separated).
 *
 * In production, only listed origins are allowed.
 * In development, all origins are allowed to ease local development.
 */
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());

export const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin "${origin}" is not allowed`));
    }
  },

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  // Headers the client is allowed to send
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-Refresh-Token',
  ],

  // Headers the client is allowed to read from the response
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],

  // Allow cookies / auth headers on cross-origin requests
  credentials: true,

  // Cache preflight response for 24 hours
  maxAge: 86400,
};
