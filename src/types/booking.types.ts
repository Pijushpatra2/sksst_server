export interface TempleHall {
  id: string;
  name: string;
  description: string;
  capacity: number;
  max_people_at_a_time: number;
  space_sqft: number;
  price_per_day: number;
  price_per_half_day: number;
  image_url: string | null;
  amenities: string | null; // JSON string array e.g. ["Central AC", "Veg Kitchen", "1200 Capacity"]
  is_active: boolean | number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CreateHallDto {
  name: string;
  description?: string;
  capacity: number;
  max_people_at_a_time?: number;
  space_sqft?: number;
  price_per_day: number;
  price_per_half_day?: number;
  image_url?: string;
  amenities?: string[] | string;
  is_active?: boolean;
}

export interface UpdateHallDto extends Partial<CreateHallDto> {}

export interface TempleHallBooking {
  id: string; // e.g. HB-2026-1001
  hall_id: string;
  hall_name: string;
  devotee_id: string | null;
  devotee_name: string;
  devotee_email: string | null;
  devotee_phone: string;
  event_title: string;
  booking_date: string | Date;
  duration_type: 'full' | 'half' | 'multi';
  duration_days: number;
  start_time: string;
  end_time: string;
  expected_guests: number;
  base_price: number;
  cleaning_fee: number;
  deposit: number;
  total_price: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
  notes: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CreateHallBookingDto {
  hall_id: string;
  hall_name?: string;
  devotee_id?: string;
  devotee_name: string;
  devotee_email?: string;
  devotee_phone: string;
  event_title: string;
  booking_date: string;
  duration_type?: 'full' | 'half' | 'multi';
  duration_days?: number;
  start_time?: string;
  end_time?: string;
  expected_guests?: number;
  notes?: string;
}

export interface TempleDarshanSlot {
  id: string;
  slot_name: string;
  start_time: string;
  end_time: string;
  max_visitors_limit: number;
  time_zone: string; // e.g. 'EAT (Africa/Kampala)'
  description: string | null;
  badge: string | null;
  is_active: boolean | number;
  created_at?: Date | string;
}

export interface CreateDarshanSlotDto {
  slot_name: string;
  start_time: string;
  end_time: string;
  max_visitors_limit?: number;
  time_zone?: string;
  description?: string;
  badge?: string;
  is_active?: boolean;
}

export interface UpdateDarshanSlotDto extends Partial<CreateDarshanSlotDto> {}

export interface TempleDarshanBooking {
  id: string; // e.g. DAR-2026-1001
  slot_id: string | null;
  slot_name: string;
  devotee_id: string | null;
  devotee_name: string;
  devotee_phone: string;
  devotee_email: string | null;
  visit_date: string | Date;
  visitor_count: number;
  qr_code_url: string | null;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED';
  created_at?: Date | string;
}

export interface CreateDarshanBookingDto {
  slot_id?: string;
  slot_name: string;
  devotee_id?: string;
  devotee_name: string;
  devotee_phone: string;
  devotee_email?: string;
  visit_date: string;
  visitor_count?: number;
}

export interface TemplePuja {
  id: string;
  name: string;
  category: 'Special' | 'Abhishek' | 'Daily' | 'Homa' | 'General';
  description: string;
  base_price: number; // Without Puja Samagri
  samagri_price: number; // Cost of Samagri kit
  duration_minutes: number;
  priest_role: string;
  image_url: string | null;
  is_active: boolean | number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CreatePujaDto {
  name: string;
  category?: 'Special' | 'Abhishek' | 'Daily' | 'Homa' | 'General';
  description?: string;
  base_price: number;
  samagri_price?: number;
  duration_minutes?: number;
  priest_role?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdatePujaDto extends Partial<CreatePujaDto> {}

export interface TemplePujaBooking {
  id: string; // e.g. PUJ-2026-1001
  puja_id: string;
  puja_name: string;
  devotee_id: string | null;
  devotee_name: string;
  devotee_phone: string | null;
  devotee_email: string | null;
  gothra: string | null;
  nakshatra: string | null;
  booking_date: string | Date;
  time_slot: string;
  has_samagri: boolean | number; // 1 = With Puja Samagri, 0 = Without
  base_amount: number;
  samagri_amount: number;
  total_amount: number;
  priest_name: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  payment_status: 'PAID' | 'PENDING' | 'REFUNDED';
  receipt_number: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CreatePujaBookingDto {
  puja_id: string;
  puja_name?: string;
  devotee_id?: string;
  devotee_name: string;
  devotee_phone?: string;
  devotee_email?: string;
  gothra?: string;
  nakshatra?: string;
  booking_date: string;
  time_slot: string;
  has_samagri?: boolean;
}
