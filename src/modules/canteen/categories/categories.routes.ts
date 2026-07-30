import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { verifyStaffOrAdminJWT, requireCanteenManager } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token checks globally across category endpoints
router.use(verifyStaffOrAdminJWT);

router.get(
  '/',
  asyncHandler(CategoriesController.listAll),
);

router.post(
  '/',
  requireCanteenManager, // Only admin or staff manager can add new categories
  asyncHandler(CategoriesController.create),
);

router.delete(
  '/:id',
  requireCanteenManager, // Only admin or staff manager can delete categories
  asyncHandler(CategoriesController.delete),
);

router.put(
  '/:id',
  requireCanteenManager, // Only admin or staff manager can update categories
  asyncHandler(CategoriesController.update),
);

export default router;
