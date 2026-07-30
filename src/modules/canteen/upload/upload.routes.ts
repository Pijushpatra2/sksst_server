import { Router } from 'express';
import { UploadController, uploadMiddleware } from './upload.controller';
import { verifyStaffOrAdminJWT, requireCanteenManager } from '@middleware/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.use(verifyStaffOrAdminJWT);

router.post(
  '/',
  requireCanteenManager,
  uploadMiddleware,
  asyncHandler(UploadController.handleUpload),
);

export default router;
