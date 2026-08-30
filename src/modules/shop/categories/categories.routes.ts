import { Router } from 'express';
import { ShopCategoriesController } from './categories.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ShopCategoriesController.list));
router.get('/:id', asyncHandler(ShopCategoriesController.getById));
router.post('/', asyncHandler(ShopCategoriesController.create));
router.put('/:id', asyncHandler(ShopCategoriesController.update));
router.delete('/:id', asyncHandler(ShopCategoriesController.delete));

export default router;
