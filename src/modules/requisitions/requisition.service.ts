import { RequisitionModel } from './requisition.model';
import {
  CreateRequisitionDto,
  AdminApproveRequisitionDto,
  ShopkeeperFulfillDto,
  StoreRequisition,
  RequisitionStats
} from '../../types/requisition.types';

export class RequisitionService {
  /**
   * Canteen Manager creates a requisition for raw materials
   */
  static async createRequisition(dto: CreateRequisitionDto): Promise<StoreRequisition> {
    if (!dto.requested_by_name) {
      throw new Error('Requested by name is required');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new Error('At least one item is required in the requisition');
    }

    return RequisitionModel.create(dto);
  }

  /**
   * Fetch a single requisition by ID
   */
  static async getRequisitionById(id: string): Promise<StoreRequisition> {
    const req = await RequisitionModel.findById(id);
    if (!req) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }
    return req;
  }

  /**
   * List requisitions with filter options
   */
  static async listRequisitions(filters: {
    status?: string;
    department?: string;
    target_shopkeeper_id?: string;
    requested_by_id?: string;
    search?: string;
  }): Promise<StoreRequisition[]> {
    return RequisitionModel.list(filters);
  }

  /**
   * Admin reviews and approves the requisition, adjusts quantities, and assigns/confirms the Shopkeeper
   */
  static async adminApprove(id: string, dto: AdminApproveRequisitionDto): Promise<StoreRequisition> {
    const existing = await RequisitionModel.findById(id);
    if (!existing) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }

    return RequisitionModel.adminApprove(id, dto);
  }

  /**
   * Admin updates storekeeper details, quantities, prices and recalculates grand total
   */
  static async adminUpdate(id: string, dto: any): Promise<StoreRequisition> {
    const existing = await RequisitionModel.findById(id);
    if (!existing) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }

    return RequisitionModel.adminUpdate(id, dto);
  }

  /**
   * Admin rejects the requisition
   */
  static async adminReject(id: string, reason: string, adminName: string): Promise<StoreRequisition> {
    const existing = await RequisitionModel.findById(id);
    if (!existing) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }

    return RequisitionModel.adminReject(id, reason, adminName);
  }

  /**
   * Shopkeeper fulfills items, enters issued quantity, system auto-calculates remaining
   */
  static async shopkeeperFulfill(id: string, dto: ShopkeeperFulfillDto): Promise<StoreRequisition> {
    const existing = await RequisitionModel.findById(id);
    if (!existing) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }

    if (!dto.items || dto.items.length === 0) {
      throw new Error('At least one item fulfillment record is required');
    }

    return RequisitionModel.shopkeeperFulfill(id, dto);
  }

  /**
   * Upload or edit receipt for a requisition
   */
  static async updateReceipt(
    id: string,
    data: {
      receipt_url: string | null;
      receipt_filename?: string | null;
      receipt_uploaded_by?: string | null;
      receipt_notes?: string | null;
    }
  ): Promise<StoreRequisition> {
    const existing = await RequisitionModel.findById(id);
    if (!existing) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }

    return RequisitionModel.updateReceipt(id, data);
  }

  /**
   * Remove receipt from a requisition
   */
  static async deleteReceipt(id: string): Promise<StoreRequisition> {
    const existing = await RequisitionModel.findById(id);
    if (!existing) {
      throw new Error(`Requisition with ID "${id}" not found`);
    }

    return RequisitionModel.deleteReceipt(id);
  }

  /**
   * Get requisition metrics
   */
  static async getStats(targetShopkeeperId?: string): Promise<RequisitionStats> {
    return RequisitionModel.getStats(targetShopkeeperId);
  }
}
