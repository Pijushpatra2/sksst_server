import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { verifyStaffOrAdminJWT, requireStaffRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token checks globally across all analytics endpoints
router.use(verifyStaffOrAdminJWT);
router.use(requireStaffRole(['manager'])); // Only manager can view business reports

router.get(
  '/today',
  asyncHandler(ReportsController.today),
);

router.get(
  '/top-customers',
  asyncHandler(ReportsController.topCustomers),
);

router.get(
  '/summary',
  asyncHandler(ReportsController.summary),
);

export default router;
