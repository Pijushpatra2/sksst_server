export type RequisitionStatus =
  | 'SUBMITTED_TO_ADMIN'
  | 'APPROVED_BY_ADMIN'
  | 'REJECTED_BY_ADMIN'
  | 'PARTIALLY_FULFILLED'
  | 'COMPLETED'
  | 'CANCELLED';

export type RequisitionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type RequisitionItemStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIAL'
  | 'FULFILLED'
  | 'OUT_OF_STOCK';

export interface StoreRequisitionItem {
  id: string;
  requisition_id: string;
  item_name: string;
  item_code?: string | null;
  category: string;
  unit: string;
  requested_qty: number;
  approved_qty: number;
  issued_qty: number;
  remaining_qty: number;
  item_status: RequisitionItemStatus;
  shopkeeper_remarks?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreRequisition {
  id: string;
  requisition_number: string;
  department: string;
  requested_by_id?: string | null;
  requested_by_name: string;
  requested_by_role?: string | null;
  priority: RequisitionPriority;
  target_shopkeeper_id?: string | null;
  target_shopkeeper_name?: string | null;
  target_store_name?: string | null;
  admin_id?: string | null;
  admin_name?: string | null;
  admin_notes?: string | null;
  status: RequisitionStatus;
  total_items_count: number;
  fulfilled_items_count: number;
  fulfillment_progress_pct: number;
  requester_notes?: string | null;
  shopkeeper_notes?: string | null;
  approved_at?: string | null;
  dispatched_at?: string | null;
  created_at: string;
  updated_at: string;
  items?: StoreRequisitionItem[];
}

export interface CreateRequisitionItemDto {
  item_name: string;
  item_code?: string;
  category?: string;
  unit?: string;
  requested_qty: number;
}

export interface CreateRequisitionDto {
  department?: string;
  requested_by_name: string;
  requested_by_id?: string;
  requested_by_role?: string;
  priority?: RequisitionPriority;
  target_shopkeeper_id?: string;
  target_shopkeeper_name?: string;
  target_store_name?: string;
  requester_notes?: string;
  items: CreateRequisitionItemDto[];
}

export interface AdminApproveItemDto {
  id: string;
  approved_qty: number;
  item_status?: RequisitionItemStatus;
}

export interface AdminApproveRequisitionDto {
  admin_id?: string;
  admin_name?: string;
  admin_notes?: string;
  target_shopkeeper_id?: string;
  target_shopkeeper_name?: string;
  target_store_name?: string;
  items?: AdminApproveItemDto[];
}

export interface ShopkeeperFulfillItemDto {
  id: string;
  issued_qty: number;
  shopkeeper_remarks?: string;
}

export interface ShopkeeperFulfillDto {
  shopkeeper_id?: string;
  shopkeeper_name?: string;
  shopkeeper_notes?: string;
  items: ShopkeeperFulfillItemDto[];
}

export interface RequisitionStats {
  totalRequisitions: number;
  pendingAdminApproval: number;
  approvedPendingShopkeeper: number;
  partiallyFulfilled: number;
  completed: number;
}
