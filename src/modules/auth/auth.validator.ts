import { z } from 'zod';

/**
 * Validation schemas for global admin authentication routes.
 */

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(180, 'Email must be under 180 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters'),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export const updatePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z
    .string()
    .min(1, 'New password is required')
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'New password must be under 100 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
