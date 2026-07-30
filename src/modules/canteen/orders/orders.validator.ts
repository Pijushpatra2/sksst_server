import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z
    .string()
    .nullable()
    .optional(),
  customerName: z
    .string()
    .min(1, 'Customer name is required')
    .max(120, 'Name must be under 120 characters'),
  customerPhone: z
    .string()
    .max(25, 'Phone must be under 25 characters')
    .nullable()
    .optional(),
  tableId: z
    .string()
    .nullable()
    .optional(),
  tableName: z
    .string()
    .max(60, 'Table name must be under 60 characters')
    .default('Counter Walk-in'),
  subtotal: z
    .number()
    .min(0, 'Subtotal cannot be negative'),
  taxAmount: z
    .number()
    .min(0, 'Tax cannot be negative')
    .default(0.00),
  serviceCharge: z
    .number()
    .min(0, 'Service charge cannot be negative')
    .default(0.00),
  discountAmount: z
    .number()
    .min(0, 'Discount cannot be negative')
    .default(0.00),
  totalAmount: z
    .number()
    .min(0, 'Total cannot be negative'),
  paymentMethod: z
    .enum(['CASH', 'UPI', 'CARD', 'PENDING'])
    .default('PENDING'),
  paymentStatus: z
    .enum(['PAID', 'PENDING', 'REFUNDED'])
    .default('PENDING'),
  orderStatus: z
    .enum(['NEW', 'PREPARING', 'READY_TO_SERVE', 'COMPLETED', 'CANCELLED'])
    .default('NEW'),
  notes: z
    .string()
    .max(1000, 'Notes must be under 1000 characters')
    .nullable()
    .optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Item ID is required'),
        itemName: z.string().min(1, 'Item name is required'),
        itemPrice: z.number().min(0),
        quantity: z.number().int().min(1),
        lineTotal: z.number().min(0),
        cookingNotes: z.string().max(300).nullable().optional(),
      }),
    )
    .min(1, 'Order must contain at least 1 item'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['NEW', 'PREPARING', 'READY_TO_SERVE', 'COMPLETED', 'CANCELLED']),
});

export const recordPaymentSchema = z.object({
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD']),
  paymentStatus: z.enum(['PAID', 'PENDING', 'REFUNDED']).default('PAID'),
});

export const orderQuerySchema = z.object({
  status: z.enum(['NEW', 'PREPARING', 'READY_TO_SERVE', 'COMPLETED', 'CANCELLED']).optional(),
  tableId: z.string().optional(),
  date: z.string().optional(), // YYYY-MM-DD
});
