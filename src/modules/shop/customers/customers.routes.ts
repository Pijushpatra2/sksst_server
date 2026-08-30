import { Router } from 'express';
import { ShopCustomersController } from './customers.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ShopCustomersController.list));
router.get('/:id', asyncHandler(ShopCustomersController.getById));

export default router;
