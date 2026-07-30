import { z } from 'zod';

export const createBookingSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(1, 'Name is required').max(120),
  customerPhone: z.string().min(5, 'Phone number is required').max(25),
  tableId: z.string().min(1, 'Table ID is required'),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  bookingTime: z.string().min(1, 'Time is required').max(20), // e.g. 02:30 PM
  partySize: z.number().int().min(1).default(2),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateBookingSchema = z.object({
  tableId: z.string().optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  bookingTime: z.string().max(20).optional(),
  partySize: z.number().int().min(1).optional(),
  status: z.enum(['CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const bookingQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW']).optional(),
});
