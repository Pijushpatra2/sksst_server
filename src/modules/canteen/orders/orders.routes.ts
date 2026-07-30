import { Router } from 'express';
import { OrderController } from './orders.controller';
import {
  createOrderSchema,
  updateOrderStatusSchema,
  recordPaymentSchema,
  orderQuerySchema,
} from './orders.validator';
import { validate } from '@middleware/validate.middleware';
import { verifyStaffOrAdminJWT, requireStaffRole } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Apply token verification globally across all order modules
router.use(verifyStaffOrAdminJWT);

router.get(
  '/',
  validate(orderQuerySchema, 'query'),
  asyncHandler(OrderController.list),
);

// Kitchen queue route (placed before parameterized :id route to prevent pattern clash)
router.get(
  '/kitchen/queue',
  requireStaffRole(['manager', 'kitchen', 'cashier', 'receptionist']),
  asyncHandler(OrderController.kitchenQueue),
);

router.get(
  '/:id',
  asyncHandler(OrderController.details),
);

router.post(
  '/',
  requireStaffRole(['manager', 'cashier', 'receptionist']), // Managers, cashiers, and receptionists can process orders
  validate(createOrderSchema),
  asyncHandler(OrderController.create),
);

router.patch(
  '/:id/status',
  requireStaffRole(['manager', 'kitchen', 'cashier', 'receptionist']),
  validate(updateOrderStatusSchema),
  asyncHandler(OrderController.updateStatus),
);

router.patch(
  '/:id/payment',
  requireStaffRole(['manager', 'cashier', 'receptionist']), // Managers, cashiers, and receptionists register payment checkouts
  validate(recordPaymentSchema),
  asyncHandler(OrderController.recordPayment),
);

router.delete(
  '/:id',
  requireStaffRole(['manager']),
  asyncHandler(OrderController.delete),
);

export default router;
