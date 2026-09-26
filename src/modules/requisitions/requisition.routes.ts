import { Router } from 'express';
import { RequisitionController } from './requisition.controller';

const router = Router();

// Stats
router.get('/stats', RequisitionController.getStats);

// Requisitions CRUD & Listing
router.get('/', RequisitionController.list);
router.post('/', RequisitionController.create);
router.get('/:id', RequisitionController.getById);

// Admin workflow actions
router.put('/:id/admin-approve', RequisitionController.adminApprove);
router.put('/:id/admin-reject', RequisitionController.adminReject);

// Shopkeeper fulfillment workflow action
router.put('/:id/shopkeeper-fulfill', RequisitionController.shopkeeperFulfill);

export default router;
