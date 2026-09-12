import { z } from 'zod';

// ==========================================
// 1. HALLS VALIDATION SCHEMAS
// ==========================================
export const createHallSchema = z.object({
  name: z.string().min(2, 'Hall name must be at least 2 characters'),
  description: z.string().optional().default(''),
  capacity: z.number().int().positive('Capacity must be greater than 0'),
  max_people_at_a_time: z.number().int().positive().optional(),
  space_sqft: z.number().positive().optional().default(1000),
  price_per_day: z.number().nonnegative('Price per day must be non-negative'),
  price_per_half_day: z.number().nonnegative().optional().default(0),
  image_url: z.string().url().optional().nullable(),
  amenities: z.union([z.array(z.string()), z.string()]).optional(),
  is_active: z.boolean().optional().default(true),
});

export const updateHallSchema = createHallSchema.partial();

// ==========================================
// 2. HALL BOOKING VALIDATION SCHEMAS
// ==========================================
export const createHallBookingSchema = z.object({
  hall_id: z.string().min(1, 'Hall ID is required'),
  devotee_name: z.string().min(2, 'Devotee name is required'),
  devotee_email: z.string().email('Valid email is required').optional().nullable(),
  devotee_phone: z.string().min(6, 'Valid phone number is required'),
  event_title: z.string().min(2, 'Event title is required'),
  booking_date: z.string().min(4, 'Booking date is required'),
  duration_type: z.enum(['full', 'half', 'multi']).optional().default('full'),
  duration_days: z.number().int().positive().optional().default(1),
  start_time: z.string().optional().default('09:00 AM'),
  end_time: z.string().optional().default('06:00 PM'),
  expected_guests: z.number().int().positive().optional().default(100),
  notes: z.string().optional().nullable(),
});

export const updateHallBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED']),
  payment_status: z.enum(['PENDING', 'PAID', 'REFUNDED']).optional(),
});

// ==========================================
// 3. DARSHAN SLOTS VALIDATION SCHEMAS
// ==========================================
export const createDarshanSlotSchema = z.object({
  slot_name: z.string().min(2, 'Slot name is required'),
  start_time: z.string().min(2, 'Start time is required'),
  end_time: z.string().min(2, 'End time is required'),
  max_visitors_limit: z.number().int().positive().optional().default(100),
  time_zone: z.string().optional().default('EAT (Africa/Kampala)'),
  description: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateDarshanSlotSchema = createDarshanSlotSchema.partial();

// ==========================================
// 4. DARSHAN BOOKING VALIDATION SCHEMAS
// ==========================================
export const createDarshanBookingSchema = z.object({
  slot_id: z.string().optional().nullable(),
  slot_name: z.string().min(1, 'Slot name is required'),
  devotee_name: z.string().min(2, 'Devotee name is required'),
  devotee_phone: z.string().min(6, 'Phone number is required'),
  devotee_email: z.string().email().optional().nullable(),
  visit_date: z.string().min(4, 'Visit date is required'),
  visitor_count: z.number().int().positive().optional().default(1),
});

export const updateDarshanBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CHECKED_IN', 'CANCELLED']),
});

// ==========================================
// 5. PUJA CATALOG VALIDATION SCHEMAS
// ==========================================
export const createPujaSchema = z.object({
  name: z.string().min(2, 'Puja name is required'),
  category: z.enum(['Special', 'Abhishek', 'Daily', 'Homa', 'General']).optional().default('Special'),
  description: z.string().optional().default(''),
  base_price: z.number().nonnegative('Base price must be non-negative'),
  samagri_price: z.number().nonnegative().optional().default(0),
  duration_minutes: z.number().int().positive().optional().default(60),
  priest_role: z.string().optional().default('Resident Mandir Shastri'),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updatePujaSchema = createPujaSchema.partial();

// ==========================================
// 6. PUJA BOOKING VALIDATION SCHEMAS
// ==========================================
export const createPujaBookingSchema = z.object({
  puja_id: z.string().min(1, 'Puja ID is required'),
  devotee_name: z.string().min(2, 'Devotee name is required'),
  devotee_phone: z.string().min(6).optional().nullable(),
  devotee_email: z.string().email().optional().nullable(),
  gothra: z.string().optional().default('Kashyap'),
  nakshatra: z.string().optional().default('General'),
  booking_date: z.string().min(4, 'Booking date is required'),
  time_slot: z.string().min(2, 'Time slot is required'),
  has_samagri: z.boolean().optional().default(true),
});

export const updatePujaBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'COMPLETED', 'CANCELLED']),
  payment_status: z.enum(['PAID', 'PENDING', 'REFUNDED']).optional(),
});
