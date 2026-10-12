import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { CmsController } from './cms.controller';
import { verifyAdminJWT } from '@middleware/auth.middleware';
import { ApiError } from '@utils/ApiError';

const router = Router();

// Multer in-memory storage for S3 uploads (15MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const uploadMiddleware = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Image upload failed' });
    }
    next();
  });
};

/**
 * Super Admin strict role guard:
 * Only users with role 'super_admin' (case-insensitive) can modify CMS content.
 */
const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const admin = (req as any).admin;
  if (!admin) {
    return next(ApiError.unauthorized('Admin credentials required'));
  }
  const roleStr = String(admin.role || '').toLowerCase();
  if (roleStr !== 'super_admin') {
    return next(ApiError.forbidden('Only Super Admin can access or edit CMS content'));
  }
  next();
};

// ─── Public Read Routes (Zero Auth - High Speed) ────────────────────────────
router.get('/pages/:slug', CmsController.getPageBundle);
router.get('/gallery', CmsController.getGallery);

// ─── Super Admin Protected Routes ──────────────────────────────────────────
router.use(verifyAdminJWT);
router.use(requireSuperAdmin);

// Pages & Sections
router.get('/pages', CmsController.getAllPages);
router.put('/pages/:slug/sections/:sectionKey', CmsController.upsertSection);
router.put('/pages/:slug/meta', CmsController.updatePageMeta);

// S3 Image Upload
router.post('/upload', uploadMiddleware, CmsController.uploadImage);

// Gallery CRUD
router.post('/gallery', CmsController.createGalleryItem);
router.put('/gallery/:id', CmsController.updateGalleryItem);
router.delete('/gallery/:id', CmsController.deleteGalleryItem);

export default router;
