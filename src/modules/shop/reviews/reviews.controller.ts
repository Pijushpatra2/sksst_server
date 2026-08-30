import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { ShopReviewsModel } from './reviews.model';

export class ShopReviewsController {
  static list = async (_req: Request, res: Response): Promise<void> => {
    const reviews = await ShopReviewsModel.listAll();
    ApiResponse.ok(res, reviews, 'Reviews retrieved successfully');
  };

  static listByProduct = async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const reviews = await ShopReviewsModel.listByProduct(productId);
    ApiResponse.ok(res, reviews, 'Product reviews retrieved successfully');
  };

  static create = async (req: Request, res: Response): Promise<void> => {
    const { productId, customerName, rating, comment, verifiedPurchase } = req.body;
    if (!productId || !customerName || !rating || !comment) {
      throw ApiError.badRequest('productId, customerName, rating and comment are required');
    }

    const created = await ShopReviewsModel.create({
      productId,
      customerName,
      rating: Number(rating),
      comment,
      verifiedPurchase: Boolean(verifiedPurchase),
    });
    ApiResponse.created(res, created, 'Review submitted successfully');
  };

  static delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await ShopReviewsModel.delete(id);
    ApiResponse.ok(res, null, 'Review deleted successfully');
  };
}
