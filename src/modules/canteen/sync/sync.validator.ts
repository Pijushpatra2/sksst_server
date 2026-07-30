import { z } from 'zod';
import { SyncAction } from './sync.types';

/**
 * sync.validator.ts
 *
 * Zod schemas for validating the POST /canteen/sync/bulk request body.
 */

const syncActionValues: [SyncAction, ...SyncAction[]] = [
  'CREATE_ORDER',
  'UPDATE_ORDER_STATUS',
  'RECORD_PAYMENT',
  'CREATE_CUSTOMER',
  'EDIT_CUSTOMER',
  'ADJUST_INVENTORY',
  'LOG_WASTE',
  'ADD_BOOKING',
  'UPDATE_BOOKING',
];

/** Schema for a single sync queue entry from the client */
const syncActionEntrySchema = z.object({
  clientId:  z.string().uuid('clientId must be a valid UUID'),
  action:    z.enum(syncActionValues),
  payload:   z.record(z.unknown()),
  createdAt: z.number().int().positive(),
  attempts:  z.number().int().min(0).default(0),
});

/** Schema for the full bulk sync request */
export const bulkSyncSchema = z.object({
  actions: z
    .array(syncActionEntrySchema)
    .min(1, 'At least one action is required')
    .max(500, 'Cannot sync more than 500 actions in one batch'),
});

export type BulkSyncInput = z.infer<typeof bulkSyncSchema>;
