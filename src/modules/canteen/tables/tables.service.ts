import { generateUUID } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { TableModel } from './tables.model';

interface CreateTableInput {
  name: string;
  capacity: number;
  locationZone?: string;
}

interface UpdateTableInput {
  name?: string;
  capacity?: number;
  status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
  currentBill?: number;
  locationZone?: string | null;
  isActive?: number;
}

/**
 * Service managing dining table business logic.
 */
export class TableService {
  static async listAll() {
    return TableModel.listActive();
  }

  static async createTable(input: CreateTableInput): Promise<string> {
    const id = generateUUID();
    await TableModel.create({
      id,
      name:          input.name,
      capacity:      input.capacity,
      location_zone: input.locationZone,
    });
    return id;
  }

  static async updateTable(id: string, input: UpdateTableInput): Promise<void> {
    const table = await TableModel.findById(id);
    if (!table) {
      throw ApiError.notFound('Table not found');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.status !== undefined) {
      updateData.status = input.status;
      // Automatically patch occupied_since based on status
      if (input.status === 'OCCUPIED') {
        updateData.occupied_since = new Date();
      } else if (input.status === 'AVAILABLE') {
        updateData.occupied_since = null;
        updateData.current_bill = 0.00; // Reset bill on checkout
      }
    }
    if (input.currentBill !== undefined) updateData.current_bill = input.currentBill;
    if (input.locationZone !== undefined) updateData.location_zone = input.locationZone;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    await TableModel.update(id, updateData);
  }

  static async deleteTable(id: string): Promise<void> {
    const table = await TableModel.findById(id);
    if (!table) {
      throw ApiError.notFound('Table not found');
    }
    await TableModel.deactivate(id);
  }
}
