import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@utils/ApiError';
import { env } from '@config/env';

/**
 * Global error handling middleware.
 * Must be registered LAST in the Express middleware chain (after all routes).
 *
 * Handles:
 *  - ApiError   → operational errors (validation, not found, auth, etc.)
 *  - Error      → unexpected / programming errors
 *
 * In production, programming errors return a generic 500 message
 * so we never leak internal details to clients.
 */
export const errorMiddleware = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const isDev = env.NODE_ENV === 'development';

  // ─── ApiError (operational) ────────────────────────────────────────────────
  if (err instanceof ApiError) {
    if (isDev) {
      console.warn(`[${req.requestId ?? 'NO-ID'}] ApiError ${err.statusCode}: ${err.message}`, err.errors);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors.length > 0 && { errors: err.errors }),
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // ─── MySQL duplicate entry (ER_DUP_ENTRY) ─────────────────────────────────
  const mysqlErr = err as NodeJS.ErrnoException & { code?: string; sqlMessage?: string };
  if (mysqlErr.code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      ...(isDev && { detail: mysqlErr.sqlMessage }),
    });
    return;
  }

  // ─── Unknown / programming errors ─────────────────────────────────────────
  console.error(`[${req.requestId ?? 'NO-ID'}] Unhandled error:`, err);

  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler.
 * Registered AFTER all routes to catch unmatched requests.
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
