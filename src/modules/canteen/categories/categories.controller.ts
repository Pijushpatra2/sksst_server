import { Request, Response } from 'express';
import { ApiError } from '@utils/ApiError';
import { ApiResponse } from '@utils/ApiResponse';
import { CategoriesModel } from './categories.model';
import { query } from '@config/db';

export class CategoriesController {
  /**
   * GET /api/canteen/categories
   */
  static listAll = async (_req: Request, res: Response): Promise<void> => {
    const list = await CategoriesModel.listAll();
    ApiResponse.ok(res, list, 'Categories retrieved successfully');
  };

  /**
   * POST /api/canteen/categories
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw ApiError.badRequest('Category name is required');
    }

    const cleanName = name.trim();
    const existing = await CategoriesModel.findByName(cleanName);
    if (existing) {
      throw ApiError.conflict('Category name already exists');
    }

    const insertId = await CategoriesModel.create(cleanName);
    ApiResponse.ok(
      res,
      { id: insertId, name: cleanName },
      'Category created successfully',
    );
  };

  /**
   * DELETE /api/canteen/categories/:id
   */
  static delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid category ID format');
    }

    const category = await CategoriesModel.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check if category is in use by food items
    const rows = await query<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM canteen_menu_items WHERE category = ? LIMIT 1',
      [category.name],
    );

    if (rows.length > 0 && rows[0].count > 0) {
      throw ApiError.conflict(
        `Cannot delete category "${category.name}" because it is currently assigned to ${rows[0].count} food items.`,
      );
    }

    await CategoriesModel.delete(id);
    ApiResponse.ok(res, null, 'Category deleted successfully');
  };

  /**
   * PUT /api/canteen/categories/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    const { name } = req.body;
    
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid category ID format');
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw ApiError.badRequest('Category name is required');
    }

    const cleanName = name.trim();
    const category = await CategoriesModel.findById(id);
    if (!category) {
      throw ApiError.notFound('Category not found');
    }

    // Check duplicate name
    if (category.name.toLowerCase() !== cleanName.toLowerCase()) {
      const existing = await CategoriesModel.findByName(cleanName);
      if (existing) {
        throw ApiError.conflict('Category name already exists');
      }
    }

    const oldName = category.name;
    
    // Update the categories table
    await CategoriesModel.update(id, cleanName);

    // Relink all existing products automatically!
    await query(
      'UPDATE canteen_menu_items SET category = ? WHERE category = ?',
      [cleanName, oldName],
    );

    ApiResponse.ok(
      res,
      { id, name: cleanName },
      'Category updated successfully',
    );
  };
}
