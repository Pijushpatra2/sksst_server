import { Router } from 'express';
import { AuthController } from './auth.controller';
import { loginSchema, refreshSchema, updatePasswordSchema } from './auth.validator';
import { validate } from '@middleware/validate.middleware';
import { authRateLimiter } from '@middleware/rateLimit.middleware';
import { verifyAdminJWT, requireAdminRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply auth rate limiter to login and token refresh to prevent brute-forcing
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(AuthController.login),
);

router.post(
  '/refresh',
  authRateLimiter,
  validate(refreshSchema),
  asyncHandler(AuthController.refresh),
);

router.post(
  '/logout',
  asyncHandler(AuthController.logout),
);

// Protected routes (require valid Bearer access token)
router.get(
  '/me',
  verifyAdminJWT,
  asyncHandler(AuthController.me),
);

router.patch(
  '/password',
  verifyAdminJWT,
  validate(updatePasswordSchema),
  asyncHandler(AuthController.changePassword),
);

// Admin Management Roster Routes (Restricted to super_admin only)
router.get(
  '/admins',
  verifyAdminJWT,
  requireAdminRole(['super_admin']),
  asyncHandler(AuthController.listAdmins),
);

router.post(
  '/admins',
  verifyAdminJWT,
  requireAdminRole(['super_admin']),
  asyncHandler(AuthController.createAdmin),
);

router.patch(
  '/admins/:id',
  verifyAdminJWT,
  requireAdminRole(['super_admin']),
  asyncHandler(AuthController.updateAdmin),
);

router.delete(
  '/admins/:id',
  verifyAdminJWT,
  requireAdminRole(['super_admin']),
  asyncHandler(AuthController.deleteAdmin),
);

export default router;
