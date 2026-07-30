import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '@utils/ApiError';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod schema validation middleware factory.
 * Validates the specified part of the request against a Zod schema.
 * On failure, throws an ApiError with field-level error details.
 *
 * Usage:
 *   router.post('/login', validate(loginSchema), authController.login);
 *   router.get('/orders', validate(orderQuerySchema, 'query'), ordersController.list);
 */
export const validate = (
  schema: ZodSchema,
  target: ValidationTarget = 'body',
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      console.warn(`[Validation Failed Target: ${target}]:`, JSON.stringify(req[target], null, 2));
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return next(new ApiError(400, 'Validation failed', errors));
    }

    // Replace the request field with the parsed (and coerced) data
    if (target === 'query') {
      // Redefine the query property to bypass Express's default read-only getter
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any)[target] = result.data;
    }
    next();
  };
};
