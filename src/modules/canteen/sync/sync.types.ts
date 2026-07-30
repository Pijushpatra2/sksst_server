/**
 * sync.types.ts
 *
 * Shared TypeScript types for the bulk sync endpoint.
 * These mirror the SyncQueueEntry structure from the frontend Dexie db.ts.
 */

export type SyncAction =
  | 'CREATE_ORDER'
  | 'UPDATE_ORDER_STATUS'
  | 'RECORD_PAYMENT'
  | 'CREATE_CUSTOMER'
  | 'EDIT_CUSTOMER'
  | 'ADJUST_INVENTORY'
  | 'LOG_WASTE'
  | 'ADD_BOOKING'
  | 'UPDATE_BOOKING';

export type SyncResultStatus = 'succeeded' | 'skipped' | 'failed';

/** One action from the client sync queue */
export interface SyncActionEntry {
  /** UUID generated on the client — used to deduplicate on the server */
  clientId: string;

  /** What kind of mutation to replay */
  action: SyncAction;

  /** The original mutation payload (matches the corresponding POST body) */
  payload: Record<string, unknown>;

  /** When the action was created offline (epoch ms) */
  createdAt: number;

  /** How many times the client has tried to sync this */
  attempts: number;
}

/** Result for a single action after processing */
export interface SyncActionResult {
  clientId: string;
  action: SyncAction;
  status: SyncResultStatus;
  serverId?: string;    // The DB-assigned ID for the created resource (if any)
  error?: string;
}

/** Full response from POST /canteen/sync/bulk */
export interface BulkSyncResponse {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  results: SyncActionResult[];
}
