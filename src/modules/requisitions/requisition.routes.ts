import { Router } from 'express';
import multer from 'multer';
import { RequisitionController } from './requisition.controller';

const router = Router();

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const uploadReceiptMiddleware = (req: any, res: any, next: any) => {
  receiptUpload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    next();
  });
};

// Stats
router.get('/stats', RequisitionController.getStats);

// Requisitions CRUD & Listing
router.get('/', RequisitionController.list);
router.post('/', RequisitionController.create);
router.get('/:id', RequisitionController.getById);
router.put('/:id', RequisitionController.update);

// Receipt upload, edit & delete actions (for Admin & Canteen Manager)
router.post('/:id/receipt', uploadReceiptMiddleware, RequisitionController.uploadReceipt);
router.put('/:id/receipt', uploadReceiptMiddleware, RequisitionController.uploadReceipt);
router.delete('/:id/receipt', RequisitionController.deleteReceipt);

// Admin workflow actions
router.put('/:id/admin-approve', RequisitionController.adminApprove);
router.put('/:id/admin-reject', RequisitionController.adminReject);

// Shopkeeper fulfillment workflow action
router.put('/:id/shopkeeper-fulfill', RequisitionController.shopkeeperFulfill);

export default router;
