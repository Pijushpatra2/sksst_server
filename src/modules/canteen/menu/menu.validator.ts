import { z } from 'zod';

export const createMenuItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be under 200 characters'),
  price: z
    .number()
    .min(0, 'Price cannot be negative'),
  category: z.string().min(1, 'Category is required'),
  variety: z.enum(['Regular', 'Jain', 'Spicy', 'Sweet']),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional(),
  imageUrl: z
    .string()
    .max(5000000, 'Image data is too large')
    .optional()
    .or(z.literal('')),
  image_url: z
    .string()
    .max(5000000, 'Image data is too large')
    .optional()
    .or(z.literal('')),
  channel: z
    .enum(['canteen', 'e-com', 'both'])
    .optional()
    .default('canteen'),
  available: z
    .union([z.boolean(), z.number()])
    .transform((val) => (val ? 1 : 0))
    .optional(),
  sortOrder: z
    .number()
    .int()
    .default(0),
});

export const updateMenuItemSchema = z.object({
  name: z
    .string()
    .max(200, 'Name must be under 200 characters')
    .optional(),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .optional(),
  category: z
    .string()
    .min(1)
    .optional(),
  variety: z
    .enum(['Regular', 'Jain', 'Spicy', 'Sweet'])
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .nullable()
    .optional(),
  imageUrl: z
    .string()
    .max(5000000, 'Image data is too large')
    .nullable()
    .optional()
    .or(z.literal('')),
  image_url: z
    .string()
    .max(5000000, 'Image data is too large')
    .nullable()
    .optional()
    .or(z.literal('')),
  channel: z
    .enum(['canteen', 'e-com', 'both'])
    .optional(),
  available: z
    .union([z.boolean(), z.number()])
    .transform((val) => (val ? 1 : 0))
    .optional(),
  sortOrder: z
    .number()
    .int()
    .optional(),
});
