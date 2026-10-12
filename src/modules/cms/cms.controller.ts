import { Request, Response, NextFunction } from 'express';
import { CmsService } from './cms.service';
import { uploadToS3 } from '@utils/s3';
import { ApiError } from '@utils/ApiError';

export class CmsController {
  /**
   * Public: Fetch full page bundle with all active sections.
   */
  static async getPageBundle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const bundle = await CmsService.getPageBundle(slug);

      if (!bundle) {
        res.status(200).json({
          success: true,
          data: {
            page: { page_slug: slug, page_title: slug, is_published: 1 },
            sections: {}
          },
          message: 'Page not found in CMS database, using fallback'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: bundle
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Fetch all pages.
   */
  static async getAllPages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pages = await CmsService.getAllPages();
      res.status(200).json({ success: true, data: pages });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Upsert a single page section.
   */
  static async upsertSection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug, sectionKey } = req.params;
      const { sectionTitle, contentJson } = req.body;

      if (!contentJson) {
        throw ApiError.badRequest('contentJson payload is required');
      }

      const updatedBy = req.admin?.email || 'SUPER_ADMIN';
      const section = await CmsService.upsertSection(
        slug,
        sectionKey,
        sectionTitle || null,
        contentJson,
        updatedBy
      );

      res.status(200).json({
        success: true,
        message: `Section '${sectionKey}' updated successfully`,
        data: section
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Update page metadata (SEO).
   */
  static async updatePageMeta(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params;
      const { metaTitle, metaDescription } = req.body;
      const updatedBy = req.admin?.email || 'SUPER_ADMIN';

      await CmsService.updatePageMeta(slug, metaTitle, metaDescription, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Page metadata updated successfully'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Upload image file to AWS S3.
   */
  static async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let fileBuffer: Buffer | null = null;
      let filename = `cms-image-${Date.now()}.jpg`;
      const folder = (req.body?.folder as string) || 'cms';

      // Check multer file
      if (req.file) {
        fileBuffer = req.file.buffer;
        filename = req.file.originalname || filename;
      } else if (req.body?.image) {
        // Handle base64 string directly
        const raw = req.body.image as string;
        if (raw.startsWith('data:') || raw.length > 50) {
          const s3Url = await uploadToS3(raw, filename, folder);
          res.status(200).json({ success: true, url: s3Url });
          return;
        }
      }

      if (!fileBuffer) {
        throw ApiError.badRequest('No image file or valid base64 payload provided');
      }

      const s3Url = await uploadToS3(fileBuffer, filename, folder);
      res.status(200).json({
        success: true,
        url: s3Url,
        filename
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: List gallery items.
   */
  static async getGallery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category = (req.query.category as string) || undefined;
      const items = await CmsService.getGalleryItems(category, true);
      res.status(200).json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Create new gallery photo item.
   */
  static async createGalleryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, category, imageUrl, capturedDate, displayOrder } = req.body;
      if (!title || !category || !imageUrl) {
        throw ApiError.badRequest('Title, category, and imageUrl are required');
      }

      const item = await CmsService.createGalleryItem({
        title,
        category,
        imageUrl,
        capturedDate,
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0
      });

      res.status(201).json({
        success: true,
        message: 'Gallery item added successfully',
        data: item
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Update gallery item.
   */
  static async updateGalleryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await CmsService.updateGalleryItem(id, req.body);

      if (!updated) {
        throw ApiError.notFound('Gallery item not found');
      }

      res.status(200).json({
        success: true,
        message: 'Gallery item updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Super Admin: Delete gallery item.
   */
  static async deleteGalleryItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await CmsService.deleteGalleryItem(id);

      if (!deleted) {
        throw ApiError.notFound('Gallery item not found');
      }

      res.status(200).json({
        success: true,
        message: 'Gallery item deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
}
