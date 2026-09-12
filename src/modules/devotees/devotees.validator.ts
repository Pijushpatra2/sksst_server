import { z } from 'zod';

export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  first_name: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp_code: z.string().min(4, 'OTP code is required for account verification'),
});

export const registerDevoteeSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  otp_code: z.string().min(4, 'OTP code is required for account verification'),
  membership_type: z.enum(['Annual', 'Life', 'Patron']).optional().default('Annual'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
});

export const updateDevoteeProfileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters').optional(),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  family_members: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
});

export const loginDevoteeSchema = z.object({
  email_or_phone: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});
