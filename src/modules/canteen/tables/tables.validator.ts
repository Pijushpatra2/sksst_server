import { z } from 'zod';

export const createTableSchema = z.object({
  name: z
    .string()
    .min(1, 'Table name is required')
    .max(100, 'Table name must be under 100 characters'),
  capacity: z
    .number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(50, 'Capacity must be under 50'),
  locationZone: z
    .string()
    .max(60, 'Zone name must be under 60 characters')
    .optional(),
});

export const updateTableSchema = z.object({
  name: z
    .string()
    .max(100, 'Table name must be under 100 characters')
    .optional(),
  capacity: z
    .number()
    .int('Capacity must be an integer')
    .min(1, 'Capacity must be at least 1')
    .max(50, 'Capacity must be under 50')
    .optional(),
  status: z
    .enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'])
    .optional(),
  currentBill: z
    .number()
    .min(0, 'Bill cannot be negative')
    .optional(),
  locationZone: z
    .string()
    .max(60, 'Zone name must be under 60 characters')
    .nullable()
    .optional(),
  isActive: z
    .union([z.boolean(), z.number()])
    .transform((val) => (val ? 1 : 0))
    .optional(),
});
