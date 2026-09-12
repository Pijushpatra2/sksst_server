import { Router } from 'express';
import { DevoteeController } from './devotees.controller';
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerDevoteeSchema,
  loginDevoteeSchema,
  updateDevoteeProfileSchema,
} from './devotees.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyDevoteeJWT } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Public Authentication endpoints
router.post(
  '/auth/send-otp',
  validate(sendOtpSchema),
  asyncHandler(DevoteeController.sendOtp),
);

router.post(
  '/auth/verify-otp',
  validate(verifyOtpSchema),
  asyncHandler(DevoteeController.verifyOtp),
);

router.post(
  '/auth/register',
  validate(registerDevoteeSchema),
  asyncHandler(DevoteeController.register),
);

router.post(
  '/auth/login',
  validate(loginDevoteeSchema),
  asyncHandler(DevoteeController.login),
);

// Protected devotee profile endpoints
router.get(
  '/auth/me',
  verifyDevoteeJWT,
  asyncHandler(DevoteeController.me),
);

router.put(
  '/profile',
  verifyDevoteeJWT,
  validate(updateDevoteeProfileSchema),
  asyncHandler(DevoteeController.updateProfile),
);

// QR Code & Membership Pass Verification (Public / Admin Scanner)
router.get(
  '/verify/:membershipNumber',
  asyncHandler(DevoteeController.verifyPass),
);

// Admin member audit list & controls
router.get(
  '/admin/all',
  asyncHandler(DevoteeController.listAll),
);

router.patch(
  '/admin/:id/status',
  asyncHandler(DevoteeController.updateStatus),
);

router.get(
  '/admin/:id/details',
  asyncHandler(DevoteeController.getDetails),
);

export default router;
