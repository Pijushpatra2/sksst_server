import { Router } from 'express';
import { ShopCouponsController } from './coupons.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(ShopCouponsController.list));
router.post('/', asyncHandler(ShopCouponsController.create));
router.post('/validate', asyncHandler(ShopCouponsController.validate));
router.patch('/:id/toggle', asyncHandler(ShopCouponsController.toggle));
router.delete('/:id', asyncHandler(ShopCouponsController.delete));

export default router;
