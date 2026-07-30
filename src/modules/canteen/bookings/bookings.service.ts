import { generateUUID } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { BookingModel } from './bookings.model';
import { TableModel } from '../tables/tables.model';

interface CreateBookingInput {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  tableId: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  notes?: string | null;
}

interface UpdateBookingInput {
  tableId?: string;
  bookingDate?: string;
  bookingTime?: string;
  partySize?: number;
  status?: 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
  notes?: string | null;
}

/**
 * Service managing dining table reservations.
 */
export class BookingService {
  static async listBookings(filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    return BookingModel.listFiltered(filters);
  }

  static async createBooking(input: CreateBookingInput, staffId: number): Promise<string> {
    const table = await TableModel.findById(input.tableId);
    if (!table) {
      throw ApiError.notFound('Table not found');
    }

    const id = generateUUID();
    await BookingModel.create({
      id,
      customer_id:    input.customerId,
      customer_name:  input.customerName,
      customer_phone: input.customerPhone,
      table_id:       input.tableId,
      booking_date:   input.bookingDate,
      booking_time:   input.bookingTime,
      party_size:     input.partySize,
      notes:          input.notes,
      booked_by:      staffId,
    });

    return id;
  }

  static async updateBooking(id: string, input: UpdateBookingInput): Promise<void> {
    const booking = await BookingModel.findById(id);
    if (!booking) {
      throw ApiError.notFound('Booking not found');
    }

    if (input.tableId) {
      const table = await TableModel.findById(input.tableId);
      if (!table) {
        throw ApiError.notFound('Table not found');
      }
    }

    const updateData: any = {};
    if (input.tableId !== undefined) updateData.table_id = input.tableId;
    if (input.bookingDate !== undefined) updateData.booking_date = input.bookingDate;
    if (input.bookingTime !== undefined) updateData.booking_time = input.bookingTime;
    if (input.partySize !== undefined) updateData.party_size = input.partySize;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.special_notes = input.notes;

    await BookingModel.update(id, updateData);

    // If seated status, dynamically lock dining table status
    if (input.status === 'SEATED') {
      await TableModel.update(booking.table_id, { status: 'OCCUPIED', occupied_since: new Date() });
    }
  }
}
