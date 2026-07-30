import { Router } from 'express';
import { BookingController } from './bookings.controller';
import {
  createBookingSchema,
  updateBookingSchema,
  bookingQuerySchema,
} from './bookings.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token checks globally across all table booking endpoints
router.use(verifyStaffOrAdminJWT);

router.get(
  '/',
  validate(bookingQuerySchema, 'query'),
  asyncHandler(BookingController.list),
);

router.post(
  '/',
  validate(createBookingSchema),
  asyncHandler(BookingController.create),
);

router.patch(
  '/:id',
  validate(updateBookingSchema),
  asyncHandler(BookingController.update),
);

export default router;
