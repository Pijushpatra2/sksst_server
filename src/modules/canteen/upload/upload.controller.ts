import { Request, Response } from 'express';
import multer from 'multer';
import { uploadToS3 } from '@utils/s3';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const uploadMiddleware = upload.single('image');

export class UploadController {
  /**
   * POST /api/canteen/upload
   * Accepts multipart file upload ('image') or base64 JSON payload ({ image: 'data:image/...' }).
   * Uploads file to AWS S3 and returns the public S3 URL.
   */
  static handleUpload = async (req: Request, res: Response): Promise<void> => {
    let imageUrl = '';

    if (req.file) {
      // Multipart form upload
      imageUrl = await uploadToS3(req.file.buffer, req.file.originalname, 'menu-items');
    } else if (req.body && req.body.image) {
      // Base64 upload
      imageUrl = await uploadToS3(req.body.image, req.body.filename || 'menu-item.jpg', 'menu-items');
    } else {
      throw ApiError.badRequest('No image file or base64 image data provided');
    }

    ApiResponse.ok(res, { url: imageUrl }, 'Image uploaded successfully to S3');
  };
}
