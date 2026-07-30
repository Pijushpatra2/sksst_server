import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { TableService } from './tables.service';

/**
 * Controller handling REST endpoints for physical canteen tables.
 */
export class TableController {
  /**
   * GET /api/canteen/tables
   */
  static list = async (_req: Request, res: Response): Promise<void> => {
    const list = await TableService.listAll();
    ApiResponse.ok(res, list, 'Tables retrieved successfully');
  };

  /**
   * POST /api/canteen/tables
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    const tableId = await TableService.createTable(req.body);
    ApiResponse.created(res, { id: tableId }, 'Table created successfully');
  };

  /**
   * PATCH /api/canteen/tables/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await TableService.updateTable(id, req.body);
    ApiResponse.ok(res, null, 'Table updated successfully');
  };

  /**
   * DELETE /api/canteen/tables/:id
   */
  static bulkDelete = async (req: Request, res: Response): Promise<void> => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      throw ApiError.badRequest('Invalid or empty ids array');
    }
    for (const id of ids) {
      await TableService.deleteTable(id);
    }
    ApiResponse.ok(res, null, `${ids.length} tables deleted successfully`);
  };

  static delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await TableService.deleteTable(id);
    ApiResponse.ok(res, null, 'Table deleted successfully');
  };
}
