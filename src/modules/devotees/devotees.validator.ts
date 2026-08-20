import { z } from 'zod';

export const registerDevoteeSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  membership_type: z.enum(['Annual', 'Life', 'Patron']).optional().default('Annual'),
});

export const loginDevoteeSchema = z.object({
  email_or_phone: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});
