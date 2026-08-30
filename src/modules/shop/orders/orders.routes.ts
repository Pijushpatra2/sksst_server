import { Router } from 'express';
import { ShopOrdersController } from './orders.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ShopOrdersController.list));
router.get('/:id', asyncHandler(ShopOrdersController.getById));
router.post('/', asyncHandler(ShopOrdersController.create));
router.patch('/:id/status', asyncHandler(ShopOrdersController.updateStatus));

export default router;
