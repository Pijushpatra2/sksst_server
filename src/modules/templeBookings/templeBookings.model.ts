import { pool, query } from '@config/db';
import {
  TempleHall,
  UpdateHallDto,
  TempleHallBooking,
  TempleDarshanSlot,
  UpdateDarshanSlotDto,
  TempleDarshanBooking,
  TemplePuja,
  UpdatePujaDto,
  TemplePujaBooking,
} from '../../types/booking.types';

export class TempleBookingsModel {
  // ==========================================
  // 1. HALLS MANAGEMENT
  // ==========================================
  static async getAllHalls(onlyActive: boolean = false): Promise<TempleHall[]> {
    let sql = 'SELECT * FROM temple_halls';
    if (onlyActive) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY capacity DESC, created_at DESC';
    return await query<TempleHall[]>(sql);
  }

  static async getHallById(id: string): Promise<TempleHall | null> {
    const sql = 'SELECT * FROM temple_halls WHERE id = ? LIMIT 1';
    const rows = await query<TempleHall[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async createHall(hall: Partial<TempleHall>): Promise<TempleHall> {
    const sql = `
      INSERT INTO temple_halls (
        id, name, description, capacity, max_people_at_a_time,
        space_sqft, price_per_day, price_per_half_day, image_url, amenities, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      hall.id,
      hall.name,
      hall.description || '',
      hall.capacity || 100,
      hall.max_people_at_a_time || hall.capacity || 100,
      hall.space_sqft || 0,
      hall.price_per_day || 0,
      hall.price_per_half_day || 0,
      hall.image_url || null,
      typeof hall.amenities === 'string' ? hall.amenities : JSON.stringify(hall.amenities || []),
      hall.is_active !== undefined ? (hall.is_active ? 1 : 0) : 1,
    ];

    await pool.query(sql, params);
    const created = await this.getHallById(hall.id!);
    if (!created) throw new Error('Failed to retrieve newly created hall');
    return created;
  }

  static async updateHall(id: string, updates: UpdateHallDto): Promise<TempleHall> {
    const allowedFields = [
      'name',
      'description',
      'capacity',
      'max_people_at_a_time',
      'space_sqft',
      'price_per_day',
      'price_per_half_day',
      'image_url',
      'amenities',
      'is_active',
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        let val = (updates as any)[field];
        if (field === 'amenities' && typeof val !== 'string') {
          val = JSON.stringify(val);
        } else if (field === 'is_active') {
          val = val ? 1 : 0;
        }
        params.push(val);
      }
    }

    if (setClauses.length > 0) {
      params.push(id);
      const sql = `UPDATE temple_halls SET ${setClauses.join(', ')} WHERE id = ?`;
      await pool.query(sql, params);
    }

    const updated = await this.getHallById(id);
    if (!updated) throw new Error('Hall not found');
    return updated;
  }

  static async deleteHall(id: string): Promise<boolean> {
    const sql = 'DELETE FROM temple_halls WHERE id = ?';
    const [result]: any = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }

  // ==========================================
  // 2. HALL BOOKINGS
  // ==========================================
  static async createHallBooking(booking: Partial<TempleHallBooking>): Promise<TempleHallBooking> {
    const sql = `
      INSERT INTO temple_hall_bookings (
        id, hall_id, hall_name, devotee_id, devotee_name, devotee_email,
        devotee_phone, event_title, booking_date, duration_type, duration_days,
        start_time, end_time, expected_guests, base_price, cleaning_fee,
        deposit, total_price, status, payment_status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      booking.id,
      booking.hall_id,
      booking.hall_name,
      booking.devotee_id || null,
      booking.devotee_name,
      booking.devotee_email || null,
      booking.devotee_phone,
      booking.event_title,
      booking.booking_date,
      booking.duration_type || 'full',
      booking.duration_days || 1,
      booking.start_time || '09:00 AM',
      booking.end_time || '06:00 PM',
      booking.expected_guests || 100,
      booking.base_price || 0,
      booking.cleaning_fee || 0,
      booking.deposit || 0,
      booking.total_price || 0,
      booking.status || 'PENDING',
      booking.payment_status || 'PENDING',
      booking.notes || null,
    ];

    await pool.query(sql, params);
    const created = await this.getHallBookingById(booking.id!);
    if (!created) throw new Error('Failed to retrieve created hall booking');
    return created;
  }

  static async getHallBookingById(id: string): Promise<TempleHallBooking | null> {
    const sql = 'SELECT * FROM temple_hall_bookings WHERE id = ? LIMIT 1';
    const rows = await query<TempleHallBooking[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async getAllHallBookings(): Promise<TempleHallBooking[]> {
    const sql = 'SELECT * FROM temple_hall_bookings ORDER BY booking_date DESC, created_at DESC';
    return await query<TempleHallBooking[]>(sql);
  }

  static async getHallBookingsByDevotee(
    criteria: { devoteeId?: string | null; email?: string | null; phone?: string | null } | string
  ): Promise<TempleHallBooking[]> {
    if (typeof criteria === 'string') {
      const val = criteria.trim();
      const sql = `
        SELECT * FROM temple_hall_bookings 
        WHERE devotee_id = ? OR devotee_email = ? OR devotee_phone = ?
        ORDER BY booking_date DESC, created_at DESC
      `;
      return await query<TempleHallBooking[]>(sql, [val, val, val]);
    }

    const { devoteeId, email, phone } = criteria;
    const conditions: string[] = [];
    const params: any[] = [];

    if (devoteeId) {
      conditions.push('devotee_id = ?');
      params.push(devoteeId);
    }
    if (email) {
      conditions.push('devotee_email = ?');
      params.push(email);
    }
    if (phone) {
      conditions.push('devotee_phone = ?');
      params.push(phone);
    }

    if (conditions.length === 0) {
      return [];
    }

    const sql = `
      SELECT * FROM temple_hall_bookings 
      WHERE ${conditions.join(' OR ')}
      ORDER BY booking_date DESC, created_at DESC
    `;
    return await query<TempleHallBooking[]>(sql, params);
  }

  static async updateHallBookingStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED',
    paymentStatus?: 'PENDING' | 'PAID' | 'REFUNDED'
  ): Promise<TempleHallBooking> {
    let sql = 'UPDATE temple_hall_bookings SET status = ?';
    const params: any[] = [status];
    if (paymentStatus) {
      sql += ', payment_status = ?';
      params.push(paymentStatus);
    }
    sql += ' WHERE id = ?';
    params.push(id);

    await pool.query(sql, params);
    const updated = await this.getHallBookingById(id);
    if (!updated) throw new Error('Hall booking not found');
    return updated;
  }

  // ==========================================
  // 3. DARSHAN SLOTS MANAGEMENT
  // ==========================================
  static async getAllDarshanSlots(onlyActive: boolean = false): Promise<TempleDarshanSlot[]> {
    let sql = 'SELECT * FROM temple_darshan_slots';
    if (onlyActive) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY start_time ASC';
    return await query<TempleDarshanSlot[]>(sql);
  }

  static async getDarshanSlotById(id: string): Promise<TempleDarshanSlot | null> {
    const sql = 'SELECT * FROM temple_darshan_slots WHERE id = ? LIMIT 1';
    const rows = await query<TempleDarshanSlot[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async createDarshanSlot(slot: Partial<TempleDarshanSlot>): Promise<TempleDarshanSlot> {
    const sql = `
      INSERT INTO temple_darshan_slots (
        id, slot_name, start_time, end_time, max_visitors_limit,
        time_zone, description, badge, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      slot.id,
      slot.slot_name,
      slot.start_time,
      slot.end_time,
      slot.max_visitors_limit || 100,
      slot.time_zone || 'EAT (Africa/Kampala)',
      slot.description || null,
      slot.badge || null,
      slot.is_active !== undefined ? (slot.is_active ? 1 : 0) : 1,
    ];

    await pool.query(sql, params);
    const created = await this.getDarshanSlotById(slot.id!);
    if (!created) throw new Error('Failed to retrieve newly created darshan slot');
    return created;
  }

  static async updateDarshanSlot(id: string, updates: UpdateDarshanSlotDto): Promise<TempleDarshanSlot> {
    const allowedFields = [
      'slot_name',
      'start_time',
      'end_time',
      'max_visitors_limit',
      'time_zone',
      'description',
      'badge',
      'is_active',
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        let val = (updates as any)[field];
        if (field === 'is_active') val = val ? 1 : 0;
        params.push(val);
      }
    }

    if (setClauses.length > 0) {
      params.push(id);
      const sql = `UPDATE temple_darshan_slots SET ${setClauses.join(', ')} WHERE id = ?`;
      await pool.query(sql, params);
    }

    const updated = await this.getDarshanSlotById(id);
    if (!updated) throw new Error('Darshan slot not found');
    return updated;
  }

  static async deleteDarshanSlot(id: string): Promise<boolean> {
    const sql = 'DELETE FROM temple_darshan_slots WHERE id = ?';
    const [result]: any = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }

  // ==========================================
  // 4. DARSHAN BOOKINGS
  // ==========================================
  static async createDarshanBooking(booking: Partial<TempleDarshanBooking>): Promise<TempleDarshanBooking> {
    const sql = `
      INSERT INTO temple_darshan_bookings (
        id, slot_id, slot_name, devotee_id, devotee_name, devotee_phone,
        devotee_email, visit_date, visitor_count, qr_code_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      booking.id,
      booking.slot_id || null,
      booking.slot_name,
      booking.devotee_id || null,
      booking.devotee_name,
      booking.devotee_phone,
      booking.devotee_email || null,
      booking.visit_date,
      booking.visitor_count || 1,
      booking.qr_code_url || null,
      booking.status || 'CONFIRMED',
    ];

    await pool.query(sql, params);
    const created = await this.getDarshanBookingById(booking.id!);
    if (!created) throw new Error('Failed to retrieve created darshan booking');
    return created;
  }

  static async getDarshanBookingById(id: string): Promise<TempleDarshanBooking | null> {
    const sql = 'SELECT * FROM temple_darshan_bookings WHERE id = ? LIMIT 1';
    const rows = await query<TempleDarshanBooking[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async getAllDarshanBookings(): Promise<TempleDarshanBooking[]> {
    const sql = 'SELECT * FROM temple_darshan_bookings ORDER BY visit_date DESC, created_at DESC';
    return await query<TempleDarshanBooking[]>(sql);
  }

  static async getDarshanBookingsByDevotee(
    criteria: { devoteeId?: string | null; email?: string | null; phone?: string | null } | string
  ): Promise<TempleDarshanBooking[]> {
    if (typeof criteria === 'string') {
      const val = criteria.trim();
      const sql = `
        SELECT * FROM temple_darshan_bookings 
        WHERE devotee_id = ? OR devotee_email = ? OR devotee_phone = ?
        ORDER BY visit_date DESC, created_at DESC
      `;
      return await query<TempleDarshanBooking[]>(sql, [val, val, val]);
    }

    const { devoteeId, email, phone } = criteria;
    const conditions: string[] = [];
    const params: any[] = [];

    if (devoteeId) {
      conditions.push('devotee_id = ?');
      params.push(devoteeId);
    }
    if (email) {
      conditions.push('devotee_email = ?');
      params.push(email);
    }
    if (phone) {
      conditions.push('devotee_phone = ?');
      params.push(phone);
    }

    if (conditions.length === 0) {
      return [];
    }

    const sql = `
      SELECT * FROM temple_darshan_bookings 
      WHERE ${conditions.join(' OR ')}
      ORDER BY visit_date DESC, created_at DESC
    `;
    return await query<TempleDarshanBooking[]>(sql, params);
  }

  static async updateDarshanBookingStatus(
    id: string,
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED'
  ): Promise<TempleDarshanBooking> {
    const sql = 'UPDATE temple_darshan_bookings SET status = ? WHERE id = ?';
    await pool.query(sql, [status, id]);
    const updated = await this.getDarshanBookingById(id);
    if (!updated) throw new Error('Darshan booking not found');
    return updated;
  }

  // ==========================================
  // 5. PUJAS MANAGEMENT
  // ==========================================
  static async getAllPujas(onlyActive: boolean = false): Promise<TemplePuja[]> {
    let sql = 'SELECT * FROM temple_pujas';
    if (onlyActive) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY category ASC, base_price ASC';
    return await query<TemplePuja[]>(sql);
  }

  static async getPujaById(id: string): Promise<TemplePuja | null> {
    const sql = 'SELECT * FROM temple_pujas WHERE id = ? LIMIT 1';
    const rows = await query<TemplePuja[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async createPuja(puja: Partial<TemplePuja>): Promise<TemplePuja> {
    const sql = `
      INSERT INTO temple_pujas (
        id, name, category, description, base_price, samagri_price,
        duration_minutes, priest_role, image_url, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      puja.id,
      puja.name,
      puja.category || 'Special',
      puja.description || '',
      puja.base_price || 0,
      puja.samagri_price || 0,
      puja.duration_minutes || 60,
      puja.priest_role || 'Resident Mandir Shastri',
      puja.image_url || null,
      puja.is_active !== undefined ? (puja.is_active ? 1 : 0) : 1,
    ];

    await pool.query(sql, params);
    const created = await this.getPujaById(puja.id!);
    if (!created) throw new Error('Failed to retrieve newly created puja');
    return created;
  }

  static async updatePuja(id: string, updates: UpdatePujaDto): Promise<TemplePuja> {
    const allowedFields = [
      'name',
      'category',
      'description',
      'base_price',
      'samagri_price',
      'duration_minutes',
      'priest_role',
      'image_url',
      'is_active',
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if ((updates as any)[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        let val = (updates as any)[field];
        if (field === 'is_active') val = val ? 1 : 0;
        params.push(val);
      }
    }

    if (setClauses.length > 0) {
      params.push(id);
      const sql = `UPDATE temple_pujas SET ${setClauses.join(', ')} WHERE id = ?`;
      await pool.query(sql, params);
    }

    const updated = await this.getPujaById(id);
    if (!updated) throw new Error('Puja not found');
    return updated;
  }

  static async deletePuja(id: string): Promise<boolean> {
    const sql = 'DELETE FROM temple_pujas WHERE id = ?';
    const [result]: any = await pool.query(sql, [id]);
    return result.affectedRows > 0;
  }

  // ==========================================
  // 6. PUJA BOOKINGS
  // ==========================================
  static async createPujaBooking(booking: Partial<TemplePujaBooking>): Promise<TemplePujaBooking> {
    const sql = `
      INSERT INTO temple_puja_bookings (
        id, puja_id, puja_name, devotee_id, devotee_name, devotee_phone,
        devotee_email, gothra, nakshatra, booking_date, time_slot,
        has_samagri, base_amount, samagri_amount, total_amount,
        priest_name, status, payment_status, receipt_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      booking.id,
      booking.puja_id,
      booking.puja_name,
      booking.devotee_id || null,
      booking.devotee_name,
      booking.devotee_phone || null,
      booking.devotee_email || null,
      booking.gothra || 'Kashyap',
      booking.nakshatra || 'General',
      booking.booking_date,
      booking.time_slot,
      booking.has_samagri !== undefined ? (booking.has_samagri ? 1 : 0) : 1,
      booking.base_amount || 0,
      booking.samagri_amount || 0,
      booking.total_amount || 0,
      booking.priest_name || 'Resident Mandir Shastri',
      booking.status || 'CONFIRMED',
      booking.payment_status || 'PAID',
      booking.receipt_number,
    ];

    await pool.query(sql, params);
    const created = await this.getPujaBookingById(booking.id!);
    if (!created) throw new Error('Failed to retrieve created puja booking');
    return created;
  }

  static async getPujaBookingById(id: string): Promise<TemplePujaBooking | null> {
    const sql = 'SELECT * FROM temple_puja_bookings WHERE id = ? LIMIT 1';
    const rows = await query<TemplePujaBooking[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async getAllPujaBookings(): Promise<TemplePujaBooking[]> {
    const sql = 'SELECT * FROM temple_puja_bookings ORDER BY booking_date DESC, created_at DESC';
    return await query<TemplePujaBooking[]>(sql);
  }

  static async getPujaBookingsByDevotee(
    criteria: { devoteeId?: string | null; email?: string | null; phone?: string | null } | string
  ): Promise<TemplePujaBooking[]> {
    if (typeof criteria === 'string') {
      const val = criteria.trim();
      const sql = `
        SELECT * FROM temple_puja_bookings 
        WHERE devotee_id = ? OR devotee_email = ? OR devotee_phone = ?
        ORDER BY booking_date DESC, created_at DESC
      `;
      return await query<TemplePujaBooking[]>(sql, [val, val, val]);
    }

    const { devoteeId, email, phone } = criteria;
    const conditions: string[] = [];
    const params: any[] = [];

    if (devoteeId) {
      conditions.push('devotee_id = ?');
      params.push(devoteeId);
    }
    if (email) {
      conditions.push('devotee_email = ?');
      params.push(email);
    }
    if (phone) {
      conditions.push('devotee_phone = ?');
      params.push(phone);
    }

    if (conditions.length === 0) {
      return [];
    }

    const sql = `
      SELECT * FROM temple_puja_bookings 
      WHERE ${conditions.join(' OR ')}
      ORDER BY booking_date DESC, created_at DESC
    `;
    return await query<TemplePujaBooking[]>(sql, params);
  }

  static async updatePujaBookingStatus(
    id: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
    paymentStatus?: 'PAID' | 'PENDING' | 'REFUNDED'
  ): Promise<TemplePujaBooking> {
    let sql = 'UPDATE temple_puja_bookings SET status = ?';
    const params: any[] = [status];
    if (paymentStatus) {
      sql += ', payment_status = ?';
      params.push(paymentStatus);
    }
    sql += ' WHERE id = ?';
    params.push(id);

    await pool.query(sql, params);
    const updated = await this.getPujaBookingById(id);
    if (!updated) throw new Error('Puja booking not found');
    return updated;
  }
}
