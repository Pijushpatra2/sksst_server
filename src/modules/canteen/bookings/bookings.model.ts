import { query } from '@config/db';
import { CanteenBooking } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_bookings` table.
 */
export class BookingModel {
  /**
   * Find booking by ID.
   */
  static async findById(id: string): Promise<CanteenBooking | null> {
    const rows = await query<CanteenBooking[]>(
      'SELECT * FROM canteen_bookings WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List bookings within a date range.
   */
  static async listFiltered(filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<CanteenBooking[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.startDate) {
      conditions.push('booking_date >= ?');
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push('booking_date <= ?');
      values.push(filters.endDate);
    }
    if (filters.status) {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM canteen_bookings ${whereClause} ORDER BY booking_date ASC, booking_time ASC`;

    return query<CanteenBooking[]>(sql, values);
  }

  /**
   * Create a table reservation booking slot.
   */
  static async create(booking: {
    id: string;
    customer_id?: string | null;
    customer_name: string;
    customer_phone: string;
    table_id: string;
    booking_date: string;
    booking_time: string;
    party_size: number;
    notes?: string | null;
    booked_by: number;
  }): Promise<void> {
    await query(
      `INSERT INTO canteen_bookings 
       (id, customer_id, customer_name, customer_phone, table_id, booking_date, booking_time, party_size, status, special_notes, booked_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
      [
        booking.id,
        booking.customer_id || null,
        booking.customer_name,
        booking.customer_phone,
        booking.table_id,
        booking.booking_date,
        booking.booking_time,
        booking.party_size,
        booking.notes || null,
        booking.booked_by,
      ],
    );
  }

  /**
   * Update table booking.
   */
  static async update(
    id: string,
    data: {
      table_id?: string;
      booking_date?: string;
      booking_time?: string;
      party_size?: number;
      status?: 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
      special_notes?: string | null;
    },
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await query(
      `UPDATE canteen_bookings SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }
}
