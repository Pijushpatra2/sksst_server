export interface DevoteeJwtPayload {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  membershipNumber: string;
  role: 'DEVOTEE';
}

export interface Devotee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password_hash: string;
  membership_number: string;
  membership_type: 'Annual' | 'Life' | 'Patron';
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED';
  joined_date: Date | string;
  valid_until: Date | string;
  qr_code_url: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postal_code?: string | null;
  family_members?: string | null; // JSON string array of family members
  avatar_url?: string | null;
  otp_code?: string | null;
  otp_expires_at?: Date | string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UpdateDevoteeProfileDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  family_members?: string;
  avatar_url?: string;
}
