import { generateUUID } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { InventoryModel } from './inventory.model';

interface CreateInventoryInput {
  name: string;
  category: 'Grains' | 'Dairy' | 'Spices' | 'Beverages' | 'Vegetables' | 'Other';
  stock: number;
  unit: string;
  minStock: number;
  supplierId?: string | null;
  unitCost?: number | null;
}

interface UpdateInventoryInput {
  name?: string;
  category?: 'Grains' | 'Dairy' | 'Spices' | 'Beverages' | 'Vegetables' | 'Other';
  unit?: string;
  minStock?: number;
  supplierId?: string | null;
  unitCost?: number | null;
}

interface AdjustStockInput {
  type: 'RESTOCK' | 'USAGE' | 'WASTE' | 'ADJUSTMENT';
  quantity: number;
  note?: string | null;
}

interface LogWasteInput {
  inventoryId?: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  reason: string;
}

/**
 * Service managing raw material inventory and food waste.
 */
export class InventoryService {
  static async listInventory() {
    return InventoryModel.listAll();
  }

  static async getLowStockAlerts() {
    return InventoryModel.getLowStockAlerts();
  }

  static async createItem(input: CreateInventoryInput): Promise<string> {
    const id = generateUUID();
    await InventoryModel.create({
      id,
      name:        input.name,
      category:    input.category,
      stock:       input.stock,
      unit:        input.unit,
      min_stock:   input.minStock,
      supplier_id: input.supplierId,
      unit_cost:   input.unitCost,
    });
    return id;
  }

  static async updateItem(id: string, input: UpdateInventoryInput): Promise<void> {
    const item = await InventoryModel.findById(id);
    if (!item) {
      throw ApiError.notFound('Inventory item not found');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.unit !== undefined) updateData.unit = input.unit;
    if (input.minStock !== undefined) updateData.min_stock = input.minStock;
    if (input.supplierId !== undefined) updateData.supplier_id = input.supplierId;
    if (input.unitCost !== undefined) updateData.unit_cost = input.unitCost;

    await InventoryModel.update(id, updateData);
  }

  static async adjustStock(id: string, input: AdjustStockInput, staffId: number): Promise<void> {
    const item = await InventoryModel.findById(id);
    if (!item) {
      throw ApiError.notFound('Inventory item not found');
    }

    await InventoryModel.adjustStock(id, {
      type:         input.type,
      quantity:     input.quantity,
      note:         input.note,
      performed_by: staffId,
    });
  }

  static async logWaste(input: LogWasteInput, staffId: number): Promise<void> {
    if (input.inventoryId) {
      const item = await InventoryModel.findById(input.inventoryId);
      if (!item) {
        throw ApiError.notFound('Inventory item not found');
      }
    }

    await InventoryModel.logWaste({
      inventory_id:   input.inventoryId,
      item_name:      input.itemName,
      quantity:       input.quantity,
      unit:           input.unit,
      estimated_cost: input.estimatedCost,
      reason:         input.reason,
      logged_by:      staffId,
    });
  }
}
