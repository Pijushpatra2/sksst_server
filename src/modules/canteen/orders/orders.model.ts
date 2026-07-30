import { pool, query } from '@config/db';
import { CanteenOrder, CanteenOrderItem } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_orders` and `canteen_order_items` tables.
 * Utilizes database transactions for atomic write integrity.
 */
export class OrderModel {
  /**
   * Find an order by ID.
   */
  static async findById(id: string): Promise<CanteenOrder | null> {
    const rows = await query<CanteenOrder[]>(
      'SELECT * FROM canteen_orders WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find order line items.
   */
  static async findItemsByOrderId(orderId: string): Promise<CanteenOrderItem[]> {
    return query<CanteenOrderItem[]>(
      'SELECT * FROM canteen_order_items WHERE order_id = ? ORDER BY id ASC',
      [orderId],
    );
  }

  /**
   * List orders with optional filters.
   */
  static async listFiltered(filters: {
    status?: string;
    table_id?: string;
    date?: string;
  }): Promise<CanteenOrder[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.status) {
      conditions.push('order_status = ?');
      values.push(filters.status);
    }
    if (filters.table_id) {
      conditions.push('table_id = ?');
      values.push(filters.table_id);
    }
    if (filters.date) {
      conditions.push('DATE(ordered_at) = ?');
      values.push(filters.date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM canteen_orders ${whereClause} ORDER BY ordered_at DESC`;

    return query<CanteenOrder[]>(sql, values);
  }

  /**
   * Retrieve kitchen display system queue (NEW and PREPARING orders).
   */
  static async getKitchenQueue(): Promise<any[]> {
    // Select from view canteen_vw_kitchen_queue
    return query<any[]>('SELECT * FROM canteen_vw_kitchen_queue');
  }

  /**
   * Create a new order with its line items atomically in a transaction.
   */
  static async createOrder(
    order: {
      id: string;
      token_number: string;
      customer_id?: string | null;
      customer_name: string;
      customer_phone?: string | null;
      table_id?: string | null;
      table_name: string;
      served_by: number | null;
      subtotal: number;
      tax_amount: number;
      service_charge: number;
      discount_amount: number;
      total_amount: number;
      payment_method: string;
      payment_status: string;
      order_status: string;
      notes?: string | null;
    },
    items: Array<{
      menu_item_id: string;
      item_name: string;
      item_price: number;
      quantity: number;
      line_total: number;
      cooking_notes?: string | null;
    }>,
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insert order header
      const orderSql = `
        INSERT INTO canteen_orders 
        (id, token_number, customer_id, customer_name, customer_phone, table_id, table_name, 
         served_by, subtotal, tax_amount, service_charge, discount_amount, total_amount, 
         payment_method, payment_status, order_status, notes, ordered_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
      
      await conn.execute(orderSql, [
        order.id,
        order.token_number,
        order.customer_id || null,
        order.customer_name,
        order.customer_phone || null,
        order.table_id || null,
        order.table_name,
        order.served_by,
        order.subtotal,
        order.tax_amount,
        order.service_charge,
        order.discount_amount,
        order.total_amount,
        order.payment_method,
        order.payment_status,
        order.order_status,
        order.notes || null,
      ]);

      // 2. Insert order items
      const itemSql = `
        INSERT INTO canteen_order_items 
        (order_id, menu_item_id, item_name, item_price, quantity, line_total, cooking_notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;

      for (const item of items) {
        await conn.execute(itemSql, [
          order.id,
          item.menu_item_id,
          item.item_name,
          item.item_price,
          item.quantity,
          item.line_total,
          item.cooking_notes || null,
        ]);
      }

      // 3. Update table bill and status if table_id is associated
      if (order.table_id) {
        // If order status is not completed/cancelled, table is OCCUPIED
        const tableStatus = (order.order_status === 'COMPLETED' || order.order_status === 'CANCELLED') ? 'AVAILABLE' : 'OCCUPIED';
        const currentBill = tableStatus === 'OCCUPIED' ? order.total_amount : 0.00;
        const occupiedSince = tableStatus === 'OCCUPIED' ? 'NOW()' : 'NULL';

        await conn.execute(
          `UPDATE canteen_tables 
           SET status = ?, current_bill = ?, occupied_since = ${occupiedSince} 
           WHERE id = ?`,
          [tableStatus, currentBill, order.table_id],
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Update order status.
   */
  static async updateStatus(id: string, status: string): Promise<void> {
    await query(
      'UPDATE canteen_orders SET order_status = ? WHERE id = ?',
      [status, id],
    );
  }

  /**
   * Record order payment details.
   */
  static async recordPayment(
    id: string,
    payment: {
      payment_method: string;
      payment_status: string;
    },
  ): Promise<void> {
    await query(
      'UPDATE canteen_orders SET payment_method = ?, payment_status = ?, completed_at = NOW() WHERE id = ?',
      [payment.payment_method, payment.payment_status, id],
    );
  }

  /**
   * Cancel/delete an order.
   */
  static async cancelOrder(id: string): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Retrieve order to check table links
      const [orders]: any = await conn.execute(
        'SELECT table_id FROM canteen_orders WHERE id = ? LIMIT 1',
        [id],
      );
      const order = orders[0];

      // Delete order items to prevent foreign key constraint failure
      await conn.execute(
        "DELETE FROM canteen_order_items WHERE order_id = ?",
        [id],
      );

      // Delete the order itself
      await conn.execute(
        "DELETE FROM canteen_orders WHERE id = ?",
        [id],
      );

      // Clean table seating if applicable
      if (order?.table_id) {
        await conn.execute(
          "UPDATE canteen_tables SET status = 'AVAILABLE', current_bill = 0.00, occupied_since = NULL WHERE id = ?",
          [order.table_id],
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
