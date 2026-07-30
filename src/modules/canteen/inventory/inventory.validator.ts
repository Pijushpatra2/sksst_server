import { z } from 'zod';

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  category: z.enum(['Grains', 'Dairy', 'Spices', 'Beverages', 'Vegetables', 'Other']),
  stock: z.number().min(0, 'Initial stock cannot be negative').default(0),
  unit: z.string().min(1, 'Measurement unit is required').max(20), // e.g. kg, Litre
  minStock: z.number().min(0, 'Min stock threshold cannot be negative').default(0),
  supplierId: z.string().nullable().optional(),
  unitCost: z.number().min(0).nullable().optional(),
});

export const updateInventoryItemSchema = z.object({
  name: z.string().max(150).optional(),
  category: z.enum(['Grains', 'Dairy', 'Spices', 'Beverages', 'Vegetables', 'Other']).optional(),
  unit: z.string().max(20).optional(),
  minStock: z.number().min(0).optional(),
  supplierId: z.string().nullable().optional(),
  unitCost: z.number().min(0).nullable().optional(),
});

export const adjustStockSchema = z.object({
  type: z.enum(['RESTOCK', 'USAGE', 'WASTE', 'ADJUSTMENT']),
  quantity: z.number({ required_error: 'Quantity is required' }), // positive/negative
  note: z.string().max(500).nullable().optional(),
});

export const wasteLogSchema = z.object({
  inventoryId: z.string().nullable().optional(),
  itemName: z.string().min(1, 'Item name is required').max(150),
  quantity: z.number().min(0.001, 'Quantity must be greater than zero'),
  unit: z.string().min(1, 'Unit is required').max(20),
  estimatedCost: z.number().min(0).default(0.00),
  reason: z.string().min(1, 'Reason is required').max(500),
});
