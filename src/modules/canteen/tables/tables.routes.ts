import { Router } from 'express';
import { TableController } from './tables.controller';
import { createTableSchema, updateTableSchema } from './tables.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT, requireStaffRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token checks globally across all floor/POS table endpoints
router.use(verifyStaffOrAdminJWT);

router.get(
  '/',
  asyncHandler(TableController.list),
);

router.post(
  '/',
  requireStaffRole(['manager']), // Only manager can add new tables to layout
  validate(createTableSchema),
  asyncHandler(TableController.create),
);

router.patch(
  '/:id',
  requireStaffRole(['manager', 'receptionist', 'cashier']), // Terminal roles allowed to change status
  validate(updateTableSchema),
  asyncHandler(TableController.update),
);

router.post(
  '/bulk-delete',
  requireStaffRole(['manager']),
  asyncHandler(TableController.bulkDelete),
);

router.delete(
  '/:id',
  requireStaffRole(['manager']), // Only manager can remove tables
  asyncHandler(TableController.delete),
);

export default router;
