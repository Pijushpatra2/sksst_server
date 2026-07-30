import type { SyncActionEntry, BulkSyncResponse, SyncActionResult } from './sync.types';
import { SyncModel } from './sync.model';
import { logger } from '@utils/logger';

/**
 * sync.service.ts
 *
 * Orchestrates the bulk sync process.
 *
 * STRATEGY:
 *   - Process ALL actions in parallel for maximum throughput.
 *   - Individual failures do NOT abort the batch (try-catch per action).
 *   - Returns a full report so the client knows which actions succeeded/failed.
 *
 * ORDERING:
 *   Sort actions by `createdAt` before processing to maintain chronological
 *   integrity (e.g., CREATE_CUSTOMER must complete before CREATE_ORDER that
 *   references the same customer).
 */
export class SyncService {
  /**
   * Process a batch of offline sync actions.
   */
  static async processBulk(actions: SyncActionEntry[]): Promise<BulkSyncResponse> {
    // Sort by createdAt ascending to maintain chronological order
    const sorted = [...actions].sort((a, b) => a.createdAt - b.createdAt);

    // Separate CREATE actions (must run first) from UPDATE actions
    const creates = sorted.filter((a) =>
      a.action.startsWith('CREATE_') || a.action.startsWith('ADD_')
    );
    const updates = sorted.filter((a) =>
      !a.action.startsWith('CREATE_') && !a.action.startsWith('ADD_')
    );

    // Phase 1: Process all CREATE/ADD actions sequentially (dependency safety)
    const createResults: SyncActionResult[] = [];
    for (const action of creates) {
      const result = await SyncModel.processAction(action);
      createResults.push(result);
      logger.info(`[Sync] ${result.status.toUpperCase()} ${result.action} (${result.clientId})`);
    }

    // Phase 2: Process all UPDATE/PATCH actions in parallel (no dependencies)
    const updateResults = await Promise.all(
      updates.map(async (action) => {
        const result = await SyncModel.processAction(action);
        logger.info(`[Sync] ${result.status.toUpperCase()} ${result.action} (${result.clientId})`);
        return result;
      })
    );

    const results = [...createResults, ...updateResults];

    const summary: BulkSyncResponse = {
      total:     results.length,
      succeeded: results.filter((r) => r.status === 'succeeded').length,
      skipped:   results.filter((r) => r.status === 'skipped').length,
      failed:    results.filter((r) => r.status === 'failed').length,
      results,
    };

    logger.info(
      `[Sync] Bulk sync complete — total: ${summary.total}, ` +
      `succeeded: ${summary.succeeded}, skipped: ${summary.skipped}, failed: ${summary.failed}`
    );

    return summary;
  }
}
