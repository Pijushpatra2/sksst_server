import crypto from 'crypto';
import { ApiError } from '@utils/ApiError';
import { TempleBookingsModel } from './templeBookings.model';
import {
  TempleHall,
  CreateHallDto,
  UpdateHallDto,
  TempleHallBooking,
  CreateHallBookingDto,
  TempleDarshanSlot,
  CreateDarshanSlotDto,
  UpdateDarshanSlotDto,
  TempleDarshanBooking,
  CreateDarshanBookingDto,
  TemplePuja,
  CreatePujaDto,
  UpdatePujaDto,
  TemplePujaBooking,
  CreatePujaBookingDto,
} from '../../types/booking.types';

export class TempleBookingsService {
  // ==========================================
  // 1. HALLS
  // ==========================================
  static async listHalls(onlyActive: boolean = false): Promise<TempleHall[]> {
    return await TempleBookingsModel.getAllHalls(onlyActive);
  }

  static async getHall(id: string): Promise<TempleHall> {
    const hall = await TempleBookingsModel.getHallById(id);
    if (!hall) {
      throw ApiError.notFound(`Hall with ID ${id} not found`);
    }
    return hall;
  }

  static async createHall(dto: CreateHallDto): Promise<TempleHall> {
    const id = `hall-${crypto.randomBytes(4).toString('hex')}`;
    const amenitiesStr = Array.isArray(dto.amenities)
      ? JSON.stringify(dto.amenities)
      : (dto.amenities || null);
    return await TempleBookingsModel.createHall({
      ...dto,
      id,
      amenities: amenitiesStr,
    });
  }

  static async updateHall(id: string, dto: UpdateHallDto): Promise<TempleHall> {
    await this.getHall(id);
    const updates = { ...dto };
    if (Array.isArray(updates.amenities)) {
      updates.amenities = JSON.stringify(updates.amenities);
    }
    return await TempleBookingsModel.updateHall(id, updates);
  }

  static async deleteHall(id: string): Promise<void> {
    await this.getHall(id);
    await TempleBookingsModel.deleteHall(id);
  }

  // ==========================================
  // 2. HALL BOOKINGS
  // ==========================================
  static async createHallBooking(
    dto: CreateHallBookingDto,
    devoteeId?: string,
  ): Promise<TempleHallBooking> {
    const hall = await this.getHall(dto.hall_id);

    const guests = dto.expected_guests || 100;
    if (hall.capacity && guests > hall.capacity) {
      throw ApiError.badRequest(
        `Expected guests (${guests}) exceeds hall maximum capacity (${hall.capacity})`,
      );
    }

    const durationDays = dto.duration_days && dto.duration_days > 0 ? dto.duration_days : 1;
    let basePrice = Number(hall.price_per_day) * durationDays;
    if (dto.duration_type === 'half' && Number(hall.price_per_half_day) > 0) {
      basePrice = Number(hall.price_per_half_day);
    }

    const cleaningFee = 150000;
    const deposit = Math.round(basePrice * 0.2);
    const totalPrice = basePrice + cleaningFee + deposit;

    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const id = `HB-${currentYear}-${randomCode}`;

    return await TempleBookingsModel.createHallBooking({
      id,
      hall_id: hall.id,
      hall_name: hall.name,
      devotee_id: devoteeId || dto.devotee_id || null,
      devotee_name: dto.devotee_name,
      devotee_email: dto.devotee_email || null,
      devotee_phone: dto.devotee_phone,
      event_title: dto.event_title,
      booking_date: dto.booking_date,
      duration_type: dto.duration_type || 'full',
      duration_days: durationDays,
      start_time: dto.start_time || '09:00 AM',
      end_time: dto.end_time || '06:00 PM',
      expected_guests: guests,
      base_price: basePrice,
      cleaning_fee: cleaningFee,
      deposit,
      total_price: totalPrice,
      status: 'PENDING',
      payment_status: 'PENDING',
      notes: dto.notes || null,
    });
  }

  static async listAllHallBookings(): Promise<TempleHallBooking[]> {
    return await TempleBookingsModel.getAllHallBookings();
  }

  static async listMyHallBookings(
    criteria: { devoteeId?: string | null; email?: string | null; phone?: string | null } | string
  ): Promise<TempleHallBooking[]> {
    return await TempleBookingsModel.getHallBookingsByDevotee(criteria);
  }

  static async updateHallBookingStatus(
    id: string,
    status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED',
    paymentStatus?: 'PENDING' | 'PAID' | 'REFUNDED',
  ): Promise<TempleHallBooking> {
    return await TempleBookingsModel.updateHallBookingStatus(id, status, paymentStatus);
  }

  // ==========================================
  // 3. DARSHAN SLOTS
  // ==========================================
  static async listDarshanSlots(onlyActive: boolean = false): Promise<TempleDarshanSlot[]> {
    return await TempleBookingsModel.getAllDarshanSlots(onlyActive);
  }

  static async getDarshanSlot(id: string): Promise<TempleDarshanSlot> {
    const slot = await TempleBookingsModel.getDarshanSlotById(id);
    if (!slot) {
      throw ApiError.notFound(`Darshan slot with ID ${id} not found`);
    }
    return slot;
  }

  static async createDarshanSlot(dto: CreateDarshanSlotDto): Promise<TempleDarshanSlot> {
    const id = `slot-${crypto.randomBytes(4).toString('hex')}`;
    return await TempleBookingsModel.createDarshanSlot({
      id,
      ...dto,
    });
  }

  static async updateDarshanSlot(id: string, dto: UpdateDarshanSlotDto): Promise<TempleDarshanSlot> {
    await this.getDarshanSlot(id);
    return await TempleBookingsModel.updateDarshanSlot(id, dto);
  }

  static async deleteDarshanSlot(id: string): Promise<void> {
    await this.getDarshanSlot(id);
    await TempleBookingsModel.deleteDarshanSlot(id);
  }

  // ==========================================
  // 4. DARSHAN BOOKINGS
  // ==========================================
  static async createDarshanBooking(
    dto: CreateDarshanBookingDto,
    devoteeId?: string,
  ): Promise<TempleDarshanBooking> {
    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const id = `DAR-${currentYear}-${randomCode}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DARSHAN_PASS:${id}:${encodeURIComponent(
      dto.devotee_name,
    )}`;

    return await TempleBookingsModel.createDarshanBooking({
      id,
      slot_id: dto.slot_id || null,
      slot_name: dto.slot_name,
      devotee_id: devoteeId || dto.devotee_id || null,
      devotee_name: dto.devotee_name,
      devotee_phone: dto.devotee_phone,
      devotee_email: dto.devotee_email || null,
      visit_date: dto.visit_date,
      visitor_count: dto.visitor_count || 1,
      qr_code_url: qrCodeUrl,
      status: 'CONFIRMED',
    });
  }

  static async listAllDarshanBookings(): Promise<TempleDarshanBooking[]> {
    return await TempleBookingsModel.getAllDarshanBookings();
  }

  static async listMyDarshanBookings(
    criteria: { devoteeId?: string | null; email?: string | null; phone?: string | null } | string
  ): Promise<TempleDarshanBooking[]> {
    return await TempleBookingsModel.getDarshanBookingsByDevotee(criteria);
  }

  static async updateDarshanBookingStatus(
    id: string,
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED',
  ): Promise<TempleDarshanBooking> {
    return await TempleBookingsModel.updateDarshanBookingStatus(id, status);
  }

  // ==========================================
  // 5. PUJAS MASTER
  // ==========================================
  static async listPujas(onlyActive: boolean = false): Promise<TemplePuja[]> {
    return await TempleBookingsModel.getAllPujas(onlyActive);
  }

  static async getPuja(id: string): Promise<TemplePuja> {
    const puja = await TempleBookingsModel.getPujaById(id);
    if (!puja) {
      throw ApiError.notFound(`Puja with ID ${id} not found`);
    }
    return puja;
  }

  static async createPuja(dto: CreatePujaDto): Promise<TemplePuja> {
    const id = `puja-${crypto.randomBytes(4).toString('hex')}`;
    return await TempleBookingsModel.createPuja({
      id,
      ...dto,
    });
  }

  static async updatePuja(id: string, dto: UpdatePujaDto): Promise<TemplePuja> {
    await this.getPuja(id);
    return await TempleBookingsModel.updatePuja(id, dto);
  }

  static async deletePuja(id: string): Promise<void> {
    await this.getPuja(id);
    await TempleBookingsModel.deletePuja(id);
  }

  // ==========================================
  // 6. PUJA BOOKINGS
  // ==========================================
  static async createPujaBooking(
    dto: CreatePujaBookingDto,
    devoteeId?: string,
  ): Promise<TemplePujaBooking> {
    const puja = await this.getPuja(dto.puja_id);

    const hasSamagri = dto.has_samagri !== false;
    const baseAmount = Number(puja.base_price);
    const samagriAmount = hasSamagri ? Number(puja.samagri_price) : 0;
    const totalAmount = baseAmount + samagriAmount;

    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const id = `PUJ-${currentYear}-${randomCode}`;
    const receiptNumber = `RCT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return await TempleBookingsModel.createPujaBooking({
      id,
      puja_id: puja.id,
      puja_name: puja.name,
      devotee_id: devoteeId || dto.devotee_id || null,
      devotee_name: dto.devotee_name,
      devotee_phone: dto.devotee_phone || null,
      devotee_email: dto.devotee_email || null,
      gothra: dto.gothra || 'Kashyap',
      nakshatra: dto.nakshatra || 'General',
      booking_date: dto.booking_date,
      time_slot: dto.time_slot,
      has_samagri: hasSamagri ? 1 : 0,
      base_amount: baseAmount,
      samagri_amount: samagriAmount,
      total_amount: totalAmount,
      priest_name: puja.priest_role || 'Resident Mandir Shastri',
      status: 'CONFIRMED',
      payment_status: 'PAID',
      receipt_number: receiptNumber,
    });
  }

  static async listAllPujaBookings(): Promise<TemplePujaBooking[]> {
    return await TempleBookingsModel.getAllPujaBookings();
  }

  static async listMyPujaBookings(
    criteria: { devoteeId?: string | null; email?: string | null; phone?: string | null } | string
  ): Promise<TemplePujaBooking[]> {
    return await TempleBookingsModel.getPujaBookingsByDevotee(criteria);
  }

  static async updatePujaBookingStatus(
    id: string,
    status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
    paymentStatus?: 'PAID' | 'PENDING' | 'REFUNDED',
  ): Promise<TemplePujaBooking> {
    return await TempleBookingsModel.updatePujaBookingStatus(id, status, paymentStatus);
  }
}
