import { pool, query } from '@config/db';
import type { SyncActionEntry, SyncActionResult } from './sync.types';

/**
 * sync.model.ts
 *
 * Handles individual sync action processing against the database.
 * Each handler is wrapped in a DB transaction for atomic integrity.
 *
 * IDEMPOTENCY:
 *   Every CREATE action checks if the clientId (UUID) already exists
 *   in the database before inserting. If found → status: 'skipped'.
 *   This makes bulk sync safe to call multiple times without duplicates.
 */

export class SyncModel {

  /**
   * Process a single sync action.
   * Dispatches to the correct handler based on action type.
   */
  static async processAction(entry: SyncActionEntry): Promise<SyncActionResult> {
    try {
      switch (entry.action) {
        case 'CREATE_ORDER':
          return await SyncModel.handleCreateOrder(entry);

        case 'UPDATE_ORDER_STATUS':
          return await SyncModel.handleUpdateOrderStatus(entry);

        case 'RECORD_PAYMENT':
          return await SyncModel.handleRecordPayment(entry);

        case 'CREATE_CUSTOMER':
          return await SyncModel.handleCreateCustomer(entry);

        case 'EDIT_CUSTOMER':
          return await SyncModel.handleEditCustomer(entry);

        case 'ADJUST_INVENTORY':
          return await SyncModel.handleAdjustInventory(entry);

        case 'LOG_WASTE':
          return await SyncModel.handleLogWaste(entry);

        case 'ADD_BOOKING':
          return await SyncModel.handleAddBooking(entry);

        case 'UPDATE_BOOKING':
          return await SyncModel.handleUpdateBooking(entry);

        default:
          return {
            clientId: entry.clientId,
            action: entry.action,
            status: 'failed',
            error: `Unknown action type: ${entry.action}`,
          };
      }
    } catch (err: any) {
      return {
        clientId: entry.clientId,
        action: entry.action,
        status: 'failed',
        error: err?.message ?? 'Unknown error during sync',
      };
    }
  }

  // ─── CREATE_ORDER ─────────────────────────────────────────────────────────

  private static async handleCreateOrder(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;
    const clientId = entry.clientId;

    // IDEMPOTENCY CHECK — skip if this order was already synced
    const existing = await query<any[]>(
      'SELECT id FROM canteen_orders WHERE id = ? LIMIT 1',
      [clientId],
    );
    if (existing.length > 0) {
      return { clientId, action: entry.action, status: 'skipped', serverId: clientId };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Insert order header using clientId as the server ID
      await conn.execute(
        `INSERT INTO canteen_orders
         (id, token_number, customer_id, customer_name, customer_phone,
          table_id, table_name, served_by, subtotal, tax_amount, service_charge,
          discount_amount, total_amount, payment_method, payment_status,
          order_status, notes, ordered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          p.token_number ?? `TKN-${Date.now().toString(36).toUpperCase()}`,
          p.customer_id ?? null,
          p.customer_name ?? 'Walk-in',
          p.customer_phone ?? null,
          p.table_id ?? null,
          p.table_name ?? 'Takeaway',
          p.served_by ?? null,
          p.subtotal ?? 0,
          p.tax_amount ?? 0,
          p.service_charge ?? 0,
          p.discount_amount ?? 0,
          p.total_amount ?? 0,
          p.payment_method ?? 'PENDING',
          p.payment_status ?? 'PENDING',
          p.order_status ?? 'NEW',
          p.notes ?? null,
          p.ordered_at
            ? new Date(p.ordered_at)
            : new Date(entry.createdAt),
        ],
      );

      // Insert order line items
      if (Array.isArray(p.items) && p.items.length > 0) {
        for (const item of p.items) {
          await conn.execute(
            `INSERT INTO canteen_order_items
             (order_id, menu_item_id, item_name, item_price, quantity, line_total, cooking_notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              clientId,
              item.menu_item_id,
              item.item_name,
              item.item_price ?? 0,
              item.quantity ?? 1,
              item.line_total ?? 0,
              item.cooking_notes ?? null,
            ],
          );
        }
      }

      // Update table status if order is associated with a table
      if (p.table_id && p.order_status !== 'CANCELLED' && p.order_status !== 'COMPLETED') {
        await conn.execute(
          `UPDATE canteen_tables
           SET status = 'OCCUPIED', current_bill = ?, occupied_since = ?
           WHERE id = ?`,
          [p.total_amount ?? 0, new Date(entry.createdAt), p.table_id],
        );
      }

      await conn.commit();
      return { clientId, action: entry.action, status: 'succeeded', serverId: clientId };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ─── UPDATE_ORDER_STATUS ──────────────────────────────────────────────────

  private static async handleUpdateOrderStatus(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;

    // Check if order exists at all
    const order = await query<any[]>('SELECT id FROM canteen_orders WHERE id = ? LIMIT 1', [p.id]);
    if (order.length === 0) {
      return { clientId: entry.clientId, action: entry.action, status: 'skipped' };
    }

    await query('UPDATE canteen_orders SET order_status = ? WHERE id = ?', [p.status, p.id]);
    return { clientId: entry.clientId, action: entry.action, status: 'succeeded' };
  }

  // ─── RECORD_PAYMENT ───────────────────────────────────────────────────────

  private static async handleRecordPayment(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;

    const order = await query<any[]>('SELECT id FROM canteen_orders WHERE id = ? LIMIT 1', [p.id]);
    if (order.length === 0) {
      return { clientId: entry.clientId, action: entry.action, status: 'skipped' };
    }

    await query(
      'UPDATE canteen_orders SET payment_method = ?, payment_status = ?, completed_at = NOW() WHERE id = ?',
      [p.payment_method, p.payment_status, p.id],
    );
    return { clientId: entry.clientId, action: entry.action, status: 'succeeded' };
  }

  // ─── CREATE_CUSTOMER ──────────────────────────────────────────────────────

  private static async handleCreateCustomer(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;
    const clientId = entry.clientId;

    // IDEMPOTENCY: skip if phone already exists OR clientId exists
    const existing = await query<any[]>(
      'SELECT id FROM canteen_customers WHERE id = ? OR phone = ? LIMIT 1',
      [clientId, p.phone],
    );
    if (existing.length > 0) {
      return {
        clientId,
        action: entry.action,
        status: 'skipped',
        serverId: existing[0].id,
      };
    }

    await query(
      `INSERT INTO canteen_customers (id, name, phone, email, customer_type, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        p.name,
        p.phone,
        p.email ?? null,
        p.customer_type ?? 'Guest',
        p.notes ?? null,
        new Date(entry.createdAt),
      ],
    );
    return { clientId, action: entry.action, status: 'succeeded', serverId: clientId };
  }

  // ─── EDIT_CUSTOMER ────────────────────────────────────────────────────────

  private static async handleEditCustomer(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;

    const customer = await query<any[]>('SELECT id FROM canteen_customers WHERE id = ? LIMIT 1', [p.id]);
    if (customer.length === 0) {
      return { clientId: entry.clientId, action: entry.action, status: 'skipped' };
    }

    const allowed = ['name', 'phone', 'email', 'customer_type', 'notes'];
    const fields: string[] = [];
    const values: any[] = [];

    for (const key of allowed) {
      if (p[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(p[key]);
      }
    }

    if (fields.length === 0) {
      return { clientId: entry.clientId, action: entry.action, status: 'skipped' };
    }

    values.push(p.id);
    await query(`UPDATE canteen_customers SET ${fields.join(', ')} WHERE id = ?`, values);
    return { clientId: entry.clientId, action: entry.action, status: 'succeeded' };
  }

  // ─── ADJUST_INVENTORY ────────────────────────────────────────────────────

  private static async handleAdjustInventory(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;

    await query(
      'UPDATE canteen_inventory SET stock = stock + ? WHERE id = ?',
      [p.quantity ?? 0, p.id],
    );
    return { clientId: entry.clientId, action: entry.action, status: 'succeeded' };
  }

  // ─── LOG_WASTE ────────────────────────────────────────────────────────────

  private static async handleLogWaste(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;
    const clientId = entry.clientId;

    // IDEMPOTENCY: skip if waste log already exists
    const existing = await query<any[]>(
      'SELECT id FROM canteen_waste_logs WHERE id = ? LIMIT 1',
      [clientId],
    );
    if (existing.length > 0) {
      return { clientId, action: entry.action, status: 'skipped' };
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO canteen_waste_logs (id, inventory_id, quantity, reason, estimated_cost, logged_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          p.inventory_id,
          p.quantity ?? 0,
          p.reason ?? null,
          p.estimated_cost ?? null,
          new Date(entry.createdAt),
        ],
      );

      // Deduct waste quantity from stock
      await conn.execute(
        'UPDATE canteen_inventory SET stock = GREATEST(0, stock - ?) WHERE id = ?',
        [p.quantity ?? 0, p.inventory_id],
      );

      await conn.commit();
      return { clientId, action: entry.action, status: 'succeeded' };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  // ─── ADD_BOOKING ──────────────────────────────────────────────────────────

  private static async handleAddBooking(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;
    const clientId = entry.clientId;

    const existing = await query<any[]>(
      'SELECT id FROM canteen_bookings WHERE id = ? LIMIT 1',
      [clientId],
    );
    if (existing.length > 0) {
      return { clientId, action: entry.action, status: 'skipped' };
    }

    await query(
      `INSERT INTO canteen_bookings
       (id, customer_id, customer_name, customer_phone, table_id,
        booking_date, booking_time, party_size, status, special_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clientId,
        p.customer_id ?? null,
        p.customer_name,
        p.customer_phone,
        p.table_id,
        p.booking_date,
        p.booking_time,
        p.party_size ?? 1,
        p.status ?? 'CONFIRMED',
        p.special_notes ?? null,
        new Date(entry.createdAt),
      ],
    );
    return { clientId, action: entry.action, status: 'succeeded', serverId: clientId };
  }

  // ─── UPDATE_BOOKING ───────────────────────────────────────────────────────

  private static async handleUpdateBooking(entry: SyncActionEntry): Promise<SyncActionResult> {
    const p = entry.payload as any;

    const booking = await query<any[]>(
      'SELECT id FROM canteen_bookings WHERE id = ? LIMIT 1',
      [p.id],
    );
    if (booking.length === 0) {
      return { clientId: entry.clientId, action: entry.action, status: 'skipped' };
    }

    const allowed = ['status', 'table_id', 'booking_date', 'booking_time', 'party_size', 'special_notes'];
    const fields: string[] = [];
    const values: any[] = [];

    for (const key of allowed) {
      if (p[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(p[key]);
      }
    }

    if (fields.length > 0) {
      values.push(p.id);
      await query(`UPDATE canteen_bookings SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return { clientId: entry.clientId, action: entry.action, status: 'succeeded' };
  }
}
