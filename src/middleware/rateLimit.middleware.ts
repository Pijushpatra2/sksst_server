import rateLimit from 'express-rate-limit';
import { env } from '@config/env';
import { ApiError } from '@utils/ApiError';

/**
 * General API rate limiter — applied globally to all routes.
 * Default: 100 requests per 15-minute window per IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,   // Return RateLimit-* headers
  legacyHeaders: false,     // Disable X-RateLimit-* headers
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests('Too many requests. Please slow down.'));
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Strict rate limiter for auth routes — prevents brute-force attacks.
 * Default: 10 requests per 15-minute window per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        'Too many login attempts. Please wait 15 minutes before trying again.',
      ),
    );
  },
  skipSuccessfulRequests: true, // Successful logins don't count toward limit
});
