/**
 * Shared TypeScript interfaces that mirror the MySQL schema.
 * These are used across models, services, and controllers.
 * All DB column names use snake_case to match MySQL convention.
 */

export interface AdminJwtPayload {
  id: number;
  email: string;
  role: 'super_admin' | 'module_admin' | 'viewer' | 'trustee' | 'accountant' | 'booking_manager' | 'content_manager';
  moduleScope: string | null;
}

export interface StaffJwtPayload {
  id: number;
  email: string;
  assignedRole: 'manager' | 'receptionist' | 'cashier' | 'kitchen';
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'module_admin' | 'viewer' | 'trustee' | 'accountant' | 'booking_manager' | 'content_manager';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  module_scope: string | null;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Canteen Staff ───────────────────────────────────────────────────────────

export type CanteenStaffRole = 'manager' | 'receptionist' | 'cashier' | 'kitchen';

export interface CanteenStaff {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  assigned_role: CanteenStaffRole;
  is_active: boolean;
  created_by: number | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Canteen Tables ──────────────────────────────────────────────────────────

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export interface CanteenTable {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
  current_bill: number;
  occupied_since: Date | null;
  location_zone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

export type MenuCategory = 'Mains' | 'Snacks' | 'Beverages' | 'Desserts' | 'Combos' | 'Add-ons';
export type MenuVariety  = 'Regular' | 'Jain' | 'Spicy' | 'Sweet';

export interface CanteenMenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  variety: MenuVariety;
  description: string | null;
  image_url: string | null;
  available: boolean;
  sort_order: number;
  channel?: 'canteen' | 'e-com' | 'both';
  created_at: Date;
  updated_at: Date;
}

// ─── Customers ───────────────────────────────────────────────────────────────

export type CustomerType = 'VIP' | 'Regular' | 'Guest';

export interface CanteenCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  customer_type: CustomerType;
  total_orders: number;
  total_visits: number;
  total_spent: number;
  last_visit: Date | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'PENDING';
export type PaymentStatus = 'PAID' | 'PENDING' | 'REFUNDED';
export type OrderStatus   = 'NEW' | 'PREPARING' | 'READY_TO_SERVE' | 'COMPLETED' | 'CANCELLED';

export interface CanteenOrder {
  id: string;
  token_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  table_id: string | null;
  table_name: string;
  served_by: number | null;
  subtotal: number;
  tax_amount: number;
  service_charge: number;
  discount_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  ordered_at: Date;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CanteenOrderItem {
  id: number;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  line_total: number;
  cooking_notes: string | null;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus = 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';

export interface CanteenBooking {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  table_id: string;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: BookingStatus;
  special_notes: string | null;
  booked_by: number | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export type InventoryCategory = 'Grains' | 'Dairy' | 'Spices' | 'Beverages' | 'Vegetables' | 'Other';
export type InventoryTxType   = 'RESTOCK' | 'USAGE' | 'WASTE' | 'ADJUSTMENT';

export interface CanteenInventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  stock: number;
  unit: string;
  min_stock: number;
  supplier_id: string | null;
  unit_cost: number | null;
  last_restocked: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export interface CanteenSupplier {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
