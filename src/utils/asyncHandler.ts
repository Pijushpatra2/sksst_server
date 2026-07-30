import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler to eliminate repetitive try/catch blocks.
 * Any thrown error (including ApiError) is forwarded to next() so the
 * global error middleware can handle it.
 *
 * Usage:
 *   router.get('/items', asyncHandler(async (req, res) => {
 *     const items = await itemService.getAll();
 *     ApiResponse.ok(res, items);
 *   }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
