import { Router } from 'express';
import { AccountingController } from './accounting.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/summary', asyncHandler(AccountingController.getSummary));
router.get('/vouchers', asyncHandler(AccountingController.getVouchers));

export default router;
