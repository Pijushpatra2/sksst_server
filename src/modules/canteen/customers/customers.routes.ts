import { Router } from 'express';
import { CustomerController } from './customers.controller';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerQuerySchema,
} from './customers.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token checks globally across all devotee CRM profile endpoints
router.use(verifyStaffOrAdminJWT);

router.get(
  '/',
  validate(listCustomerQuerySchema, 'query'),
  asyncHandler(CustomerController.list),
);

router.get(
  '/:id',
  asyncHandler(CustomerController.details),
);

router.post(
  '/',
  validate(createCustomerSchema),
  asyncHandler(CustomerController.create),
);

router.patch(
  '/:id',
  validate(updateCustomerSchema),
  asyncHandler(CustomerController.update),
);

router.delete(
  '/:id',
  asyncHandler(CustomerController.delete),
);

export default router;
