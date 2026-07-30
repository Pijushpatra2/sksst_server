import { Router } from 'express';
import { CanteenAuthController } from './canteenAuth.controller';
import { staffLoginSchema, staffRefreshSchema } from '../staff/staff.validator';
import { validate } from '@middleware/validate.middleware';
import { authRateLimiter } from '@middleware/rateLimit.middleware';
import { verifyStaffJWT } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply auth rate limiting to prevent terminal brute-forcing
router.post(
  '/login',
  authRateLimiter,
  validate(staffLoginSchema),
  asyncHandler(CanteenAuthController.login),
);

router.post(
  '/refresh',
  authRateLimiter,
  validate(staffRefreshSchema),
  asyncHandler(CanteenAuthController.refresh),
);

router.post(
  '/logout',
  asyncHandler(CanteenAuthController.logout),
);

// Protected routes (require Bearer JWT for staff)
router.get(
  '/me',
  verifyStaffJWT,
  asyncHandler(CanteenAuthController.me),
);

export default router;
