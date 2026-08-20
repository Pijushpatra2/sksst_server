import { Router } from 'express';
import { DevoteeController } from './devotees.controller';
import { registerDevoteeSchema, loginDevoteeSchema } from './devotees.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyDevoteeJWT } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Public Authentication endpoints
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

// Protected profile endpoint
router.get(
  '/auth/me',
  verifyDevoteeJWT,
  asyncHandler(DevoteeController.me),
);

export default router;
