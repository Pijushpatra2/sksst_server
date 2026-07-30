import { Router } from 'express';
import { StaffController } from './staff.controller';
import { createStaffSchema, updateStaffSchema } from './staff.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyAdminJWT, requireAdminRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Secure all staff management endpoints to admins only
router.use(verifyAdminJWT);
router.use(requireAdminRole(['super_admin', 'module_admin']));

router.get(
  '/',
  asyncHandler(StaffController.list),
);

router.post(
  '/',
  validate(createStaffSchema),
  asyncHandler(StaffController.create),
);

router.patch(
  '/:id',
  validate(updateStaffSchema),
  asyncHandler(StaffController.update),
);

router.delete(
  '/:id',
  asyncHandler(StaffController.delete),
);

export default router;
