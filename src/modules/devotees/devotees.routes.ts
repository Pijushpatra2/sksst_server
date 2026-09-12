import { Router } from 'express';
import { DevoteeController } from './devotees.controller';
import {
  sendOtpSchema,
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

// Admin member audit list
router.get(
  '/admin/all',
  asyncHandler(DevoteeController.listAll),
);

export default router;
