import { Router } from 'express';
import { SyncController } from './sync.controller';
import { bulkSyncSchema } from './sync.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT, requireStaffRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

/**
 * sync.routes.ts
 *
 * Mounted at: POST /api/canteen/sync/bulk
 *
 * Auth: Staff or Admin JWT required
 * Rate limit: Inherits global rate limiter from app.ts
 */
const router = Router();

// All sync routes require a valid token
router.use(verifyStaffOrAdminJWT);

/**
 * POST /api/canteen/sync/bulk
 *
 * Accepts an array of offline-queued mutations from the Canteen POS client.
 * Processes each action idempotently and returns a result report.
 *
 * Body:
 *   { actions: SyncActionEntry[] }   — max 500 actions per request
 *
 * Response:
 *   { success: true, data: BulkSyncResponse }
 */
router.post(
  '/bulk',
  // Any logged-in staff member can trigger sync — data was created by them offline
  requireStaffRole(['manager', 'cashier', 'receptionist', 'kitchen']),
  validate(bulkSyncSchema),
  asyncHandler(SyncController.bulkSync),
);

export default router;
