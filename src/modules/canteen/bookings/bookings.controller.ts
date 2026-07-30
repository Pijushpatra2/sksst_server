import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { BookingService } from './bookings.service';

/**
 * Controller handling REST endpoints for dining table reservations.
 */
export class BookingController {
  /**
   * GET /api/canteen/bookings
   */
  static list = async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate, status } = req.query as any;

    const filters = {
      startDate,
      endDate,
      status,
    };

    const list = await BookingService.listBookings(filters);
    ApiResponse.ok(res, list, 'Bookings retrieved successfully');
  };

  /**
   * POST /api/canteen/bookings
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    // req.staff is populated by verifyStaffJWT
    const staffId = req.staff!.id;
    const bookingId = await BookingService.createBooking(req.body, staffId);
    ApiResponse.created(res, { id: bookingId }, 'Booking registered successfully');
  };

  /**
   * PATCH /api/canteen/bookings/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await BookingService.updateBooking(id, req.body);
    ApiResponse.ok(res, null, 'Booking updated successfully');
  };
}
