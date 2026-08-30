import { Router } from 'express';
import { ShopReviewsController } from './reviews.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ShopReviewsController.list));
router.get('/product/:productId', asyncHandler(ShopReviewsController.listByProduct));
router.post('/', asyncHandler(ShopReviewsController.create));
router.delete('/:id', asyncHandler(ShopReviewsController.delete));

export default router;
