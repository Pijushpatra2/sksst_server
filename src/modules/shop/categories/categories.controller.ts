import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { ShopCategoriesModel } from './categories.model';

export class ShopCategoriesController {
  static list = async (_req: Request, res: Response): Promise<void> => {
    const categories = await ShopCategoriesModel.listAll();
    ApiResponse.ok(res, categories, 'Categories retrieved successfully');
  };

  static getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const category = await ShopCategoriesModel.findById(id);
    if (!category) throw ApiError.notFound('Category not found');
    ApiResponse.ok(res, category, 'Category details retrieved');
  };

  static create = async (req: Request, res: Response): Promise<void> => {
    const { name, slug, description, imageUrl } = req.body;
    if (!name) throw ApiError.badRequest('Category name is required');
    const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const id = `cat-${autoSlug}`;

    const created = await ShopCategoriesModel.create({
      id,
      name,
      slug: autoSlug,
      description,
      imageUrl,
    });
    ApiResponse.created(res, created, 'Category created successfully');
  };

  static update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updated = await ShopCategoriesModel.update(id, req.body);
    if (!updated) throw ApiError.notFound('Category not found');
    ApiResponse.ok(res, updated, 'Category updated successfully');
  };

  static delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await ShopCategoriesModel.delete(id);
    ApiResponse.ok(res, null, 'Category deleted successfully');
  };
}
