import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, 'Devotee name is required')
    .max(120, 'Name must be under 120 characters'),
  phone: z
    .string()
    .min(5, 'Phone number is required')
    .max(25, 'Phone number must be under 25 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .max(180, 'Email must be under 180 characters')
    .optional()
    .or(z.literal('')),
  customerType: z.enum(['VIP', 'Regular', 'Guest']),
  notes: z
    .string()
    .max(1000, 'Notes must be under 1000 characters')
    .optional(),
});

export const updateCustomerSchema = z.object({
  name: z
    .string()
    .max(120, 'Name must be under 120 characters')
    .optional(),
  phone: z
    .string()
    .max(25, 'Phone number must be under 25 characters')
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .max(180, 'Email must be under 180 characters')
    .nullable()
    .optional()
    .or(z.literal('')),
  customerType: z
    .enum(['VIP', 'Regular', 'Guest'])
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be under 1000 characters')
    .nullable()
    .optional(),
  isActive: z
    .union([z.boolean(), z.number()])
    .transform((val) => (val ? 1 : 0))
    .optional(),
});

export const listCustomerQuerySchema = z.object({
  search: z.string().optional(),
  customerType: z.enum(['VIP', 'Regular', 'Guest']).optional(),
  page: z
    .string()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
});
