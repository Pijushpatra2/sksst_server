import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  adjustStockSchema,
  wasteLogSchema,
  addToMenuSchema,
} from './inventory.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT, requireStaffRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token checks globally across all inventory endpoints
router.use(verifyStaffOrAdminJWT);

router.get(
  '/',
  asyncHandler(InventoryController.list),
);

router.get(
  '/low-stock',
  asyncHandler(InventoryController.lowStock),
);

router.post(
  '/',
  requireStaffRole(['manager']), // Manager or Admin can add new item listings to database
  validate(createInventoryItemSchema),
  asyncHandler(InventoryController.create),
);

router.patch(
  '/:id',
  requireStaffRole(['manager']),
  validate(updateInventoryItemSchema),
  asyncHandler(InventoryController.update),
);

router.delete(
  '/:id',
  requireStaffRole(['manager']),
  asyncHandler(InventoryController.delete),
);

router.post(
  '/:id/add-to-menu',
  requireStaffRole(['manager']),
  validate(addToMenuSchema),
  asyncHandler(InventoryController.addToMenu),
);

router.post(
  '/:id/adjust',
  requireStaffRole(['manager', 'kitchen']), // Managers, kitchen staff or admins adjust stock levels
  validate(adjustStockSchema),
  asyncHandler(InventoryController.adjust),
);

router.post(
  '/waste',
  requireStaffRole(['manager', 'kitchen']), // Managers, kitchen staff or admins log wastage
  validate(wasteLogSchema),
  asyncHandler(InventoryController.logWaste),
);

export default router;
