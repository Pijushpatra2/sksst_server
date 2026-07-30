import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { MenuService } from './menu.service';

/**
 * Controller handling REST endpoints for food menu items.
 */
export class MenuController {
  /**
   * GET /api/canteen/menu
   */
  static list = async (req: Request, res: Response): Promise<void> => {
    const { category, variety, available, channel } = req.query;

    const filters = {
      category:  category ? String(category) : undefined,
      variety:   variety ? String(variety) : undefined,
      available: available !== undefined ? Number(available) : undefined,
      channel:   channel ? String(channel) : undefined,
    };

    const list = await MenuService.listItems(filters);
    ApiResponse.ok(res, list, 'Menu items retrieved successfully');
  };

  /**
   * POST /api/canteen/menu
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    const itemId = await MenuService.createItem(req.body);
    ApiResponse.created(res, { id: itemId }, 'Menu item created successfully');
  };

  /**
   * PATCH /api/canteen/menu/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await MenuService.updateItem(id, req.body);
    ApiResponse.ok(res, null, 'Menu item updated successfully');
  };

  /**
   * DELETE /api/canteen/menu/:id
   *
   * Returns 200 with mode: 'hard' (permanent delete) or 'soft' (hidden,
   * had FK references in order history).
   */
  static bulkDelete = async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw ApiError.badRequest('Invalid or empty ids array');
    }
    for (const id of ids) {
      await MenuService.deleteItem(id);
    }
    ApiResponse.ok(res, null, `${ids.length} menu items deleted successfully`);
  };

  static delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { mode } = await MenuService.deleteItem(id);

    const message =
      mode === 'soft'
        ? 'Menu item hidden from POS (it has historical orders and cannot be permanently removed)'
        : 'Menu item deleted successfully';

    ApiResponse.ok(res, { id, mode }, message);
  };
}
