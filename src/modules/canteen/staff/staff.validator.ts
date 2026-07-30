import { z } from 'zod';

/**
 * Zod validation schemas for canteen staff auth and CRUD controls.
 */

// Login validator
export const staffLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(180, 'Email must be under 180 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// Create validator
export const createStaffSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be under 120 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(180, 'Email must be under 180 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters'),
  assignedRole: z.enum(['manager', 'receptionist', 'cashier', 'kitchen']),
});

// Update validator
export const updateStaffSchema = z.object({
  name: z
    .string()
    .max(120, 'Name must be under 120 characters')
    .optional(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters')
    .optional(),
  assignedRole: z
    .enum(['manager', 'receptionist', 'cashier', 'kitchen'])
    .optional(),
  isActive: z
    .union([z.boolean(), z.number()])
    .transform((val) => (val ? 1 : 0))
    .optional(),
});

export const staffRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
