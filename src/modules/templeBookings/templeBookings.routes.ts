import { Router } from 'express';
import { TempleBookingsController } from './templeBookings.controller';
import {
  createHallSchema,
  updateHallSchema,
  createHallBookingSchema,
  updateHallBookingStatusSchema,
  createDarshanSlotSchema,
  updateDarshanSlotSchema,
  createDarshanBookingSchema,
  updateDarshanBookingStatusSchema,
  createPujaSchema,
  updatePujaSchema,
  createPujaBookingSchema,
  updatePujaBookingStatusSchema,
} from './templeBookings.validator';
import { validate } from '@middleware/validate.middleware';
import { optionalDevoteeJWT } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// ==========================================
// 1. HALLS MANAGEMENT
// ==========================================
router.get('/halls', asyncHandler(TempleBookingsController.listHalls));
router.get('/halls/:id', asyncHandler(TempleBookingsController.getHall));
router.post(
  '/halls',
  validate(createHallSchema),
  asyncHandler(TempleBookingsController.createHall),
);
router.put(
  '/halls/:id',
  validate(updateHallSchema),
  asyncHandler(TempleBookingsController.updateHall),
);
router.delete('/halls/:id', asyncHandler(TempleBookingsController.deleteHall));

// ==========================================
// 2. HALL BOOKINGS
// ==========================================
router.post(
  '/hall-bookings',
  optionalDevoteeJWT,
  validate(createHallBookingSchema),
  asyncHandler(TempleBookingsController.createHallBooking),
);
router.get('/hall-bookings/my', optionalDevoteeJWT, asyncHandler(TempleBookingsController.listMyHallBookings));
router.get('/hall-bookings', asyncHandler(TempleBookingsController.listAllHallBookings));
router.patch(
  '/hall-bookings/:id/status',
  validate(updateHallBookingStatusSchema),
  asyncHandler(TempleBookingsController.updateHallBookingStatus),
);

// ==========================================
// 3. DARSHAN SLOTS
// ==========================================
router.get('/darshan-slots', asyncHandler(TempleBookingsController.listDarshanSlots));
router.get('/darshan-slots/:id', asyncHandler(TempleBookingsController.getDarshanSlot));
router.post(
  '/darshan-slots',
  validate(createDarshanSlotSchema),
  asyncHandler(TempleBookingsController.createDarshanSlot),
);
router.put(
  '/darshan-slots/:id',
  validate(updateDarshanSlotSchema),
  asyncHandler(TempleBookingsController.updateDarshanSlot),
);
router.delete('/darshan-slots/:id', asyncHandler(TempleBookingsController.deleteDarshanSlot));

// ==========================================
// 4. DARSHAN BOOKINGS
// ==========================================
router.post(
  '/darshan-bookings',
  optionalDevoteeJWT,
  validate(createDarshanBookingSchema),
  asyncHandler(TempleBookingsController.createDarshanBooking),
);
router.get('/darshan-bookings/my', optionalDevoteeJWT, asyncHandler(TempleBookingsController.listMyDarshanBookings));
router.get('/darshan-bookings', asyncHandler(TempleBookingsController.listAllDarshanBookings));
router.patch(
  '/darshan-bookings/:id/status',
  validate(updateDarshanBookingStatusSchema),
  asyncHandler(TempleBookingsController.updateDarshanBookingStatus),
);

// ==========================================
// 5. PUJAS MASTER
// ==========================================
router.get('/pujas', asyncHandler(TempleBookingsController.listPujas));
router.get('/pujas/:id', asyncHandler(TempleBookingsController.getPuja));
router.post(
  '/pujas',
  validate(createPujaSchema),
  asyncHandler(TempleBookingsController.createPuja),
);
router.put(
  '/pujas/:id',
  validate(updatePujaSchema),
  asyncHandler(TempleBookingsController.updatePuja),
);
router.delete('/pujas/:id', asyncHandler(TempleBookingsController.deletePuja));

// ==========================================
// 6. PUJA BOOKINGS
// ==========================================
router.post(
  '/puja-bookings',
  optionalDevoteeJWT,
  validate(createPujaBookingSchema),
  asyncHandler(TempleBookingsController.createPujaBooking),
);
router.get('/puja-bookings/my', optionalDevoteeJWT, asyncHandler(TempleBookingsController.listMyPujaBookings));
router.get('/puja-bookings', asyncHandler(TempleBookingsController.listAllPujaBookings));
router.patch(
  '/puja-bookings/:id/status',
  validate(updatePujaBookingStatusSchema),
  asyncHandler(TempleBookingsController.updatePujaBookingStatus),
);

export default router;
