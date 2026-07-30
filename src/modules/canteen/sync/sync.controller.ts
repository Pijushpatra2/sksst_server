import { Request, Response } from 'express';
import { SyncService } from './sync.service';
import { ApiResponse } from '@utils/ApiResponse';
import type { BulkSyncInput } from './sync.validator';

/**
 * sync.controller.ts
 *
 * Handles POST /canteen/sync/bulk
 *
 * This is the single endpoint that receives all offline-queued mutations
 * from the Canteen POS client when the device reconnects to the internet.
 */
export class SyncController {
  /**
   * POST /canteen/sync/bulk
   *
   * Body: { actions: SyncActionEntry[] }
   *
   * Processes all queued offline actions in a single request.
   * Returns a per-action result report so the client can mark each entry done/failed.
   *
   * SAFE TO CALL MULTIPLE TIMES — all CREATE actions are idempotent by clientId.
   */
  static async bulkSync(req: Request, res: Response): Promise<Response> {
    const { actions } = req.body as BulkSyncInput;

    const result = await SyncService.processBulk(actions);

    // Always return 200 even if some actions failed individually.
    // The client handles per-action failures from the result array.
    return ApiResponse.ok(res, result, `Sync complete: ${result.succeeded} succeeded, ${result.failed} failed`);
  }
}
