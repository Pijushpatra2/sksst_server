import { Router } from 'express';
import { MenuController } from './menu.controller';
import { createMenuItemSchema, updateMenuItemSchema } from './menu.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT, requireCanteenManager } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Public endpoints (no auth required)
router.get(
  '/',
  asyncHandler(MenuController.list),
);

// Apply token checks globally to modifying endpoints below
router.use(verifyStaffOrAdminJWT);

router.post(
  '/',
  requireCanteenManager, // Only admin or staff manager can add new items to menu catalog
  validate(createMenuItemSchema),
  asyncHandler(MenuController.create),
);

router.patch(
  '/:id',
  requireCanteenManager, // Only admin or staff manager can update item details/prices
  validate(updateMenuItemSchema),
  asyncHandler(MenuController.update),
);

router.post(
  '/bulk-delete',
  requireCanteenManager,
  asyncHandler(MenuController.bulkDelete),
);

router.delete(
  '/:id',
  requireCanteenManager, // Only admin or staff manager can remove items
  asyncHandler(MenuController.delete),
);

export default router;
