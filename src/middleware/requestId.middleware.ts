import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Injects a unique request ID into every incoming request.
 *
 * Priority:
 *  1. X-Request-ID header (if client provided one — useful for tracing)
 *  2. Auto-generated UUID v4
 *
 * The ID is:
 *  - Attached to req.requestId
 *  - Returned in the X-Request-ID response header
 *  - Included in morgan log lines via the custom :reqId token
 *
 * This enables cross-worker tracing across PM2 cluster instances.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const id =
    (req.headers['x-request-id'] as string | undefined) ?? uuidv4();

  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};
