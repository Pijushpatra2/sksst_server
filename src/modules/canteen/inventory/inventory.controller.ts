import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { InventoryService } from './inventory.service';

/**
 * Controller handling REST endpoints for inventory stock levels and waste logs.
 */
export class InventoryController {
  /**
   * GET /api/canteen/inventory
   */
  static list = async (_req: Request, res: Response): Promise<void> => {
    const list = await InventoryService.listInventory();
    ApiResponse.ok(res, list, 'Inventory items retrieved successfully');
  };

  /**
   * GET /api/canteen/inventory/low-stock
   */
  static lowStock = async (_req: Request, res: Response): Promise<void> => {
    const alerts = await InventoryService.getLowStockAlerts();
    ApiResponse.ok(res, alerts, 'Low stock alerts retrieved successfully');
  };

  /**
   * POST /api/canteen/inventory
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    const itemId = await InventoryService.createItem(req.body);
    ApiResponse.created(res, { id: itemId }, 'Inventory item created successfully');
  };

  /**
   * PATCH /api/canteen/inventory/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await InventoryService.updateItem(id, req.body);
    ApiResponse.ok(res, null, 'Inventory item updated successfully');
  };

  /**
   * POST /api/canteen/inventory/:id/adjust
   */
  static adjust = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const staffId = req.staff!.id;
    await InventoryService.adjustStock(id, req.body, staffId);
    ApiResponse.ok(res, null, 'Stock adjusted successfully');
  };

  /**
   * POST /api/canteen/inventory/waste
   */
  static logWaste = async (req: Request, res: Response): Promise<void> => {
    const staffId = req.staff!.id;
    await InventoryService.logWaste(req.body, staffId);
    ApiResponse.created(res, null, 'Waste logged successfully');
  };
}
