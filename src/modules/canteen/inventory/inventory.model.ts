import { pool, query } from '@config/db';
import { CanteenInventoryItem } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_inventory`, `canteen_inventory_log` and `canteen_waste_log` tables.
 * Utilizes database transactions for inventory stock adjustments.
 */
export class InventoryModel {
  /**
   * Find inventory item by ID.
   */
  static async findById(id: string): Promise<CanteenInventoryItem | null> {
    const rows = await query<CanteenInventoryItem[]>(
      'SELECT * FROM canteen_inventory WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List all inventory items.
   */
  static async listAll(): Promise<CanteenInventoryItem[]> {
    return query<CanteenInventoryItem[]>(
      'SELECT * FROM canteen_inventory ORDER BY name ASC',
    );
  }

  /**
   * Fetch low stock alert levels from database view.
   */
  static async getLowStockAlerts(): Promise<any[]> {
    return query<any[]>('SELECT * FROM canteen_vw_low_stock');
  }

  /**
   * Create a new raw material item in inventory database.
   */
  static async create(item: {
    id: string;
    name: string;
    category: string;
    stock: number;
    unit: string;
    min_stock: number;
    supplier_id?: string | null;
    unit_cost?: number | null;
  }): Promise<void> {
    await query(
      `INSERT INTO canteen_inventory 
       (id, name, category, stock, unit, min_stock, supplier_id, unit_cost) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.category,
        item.stock,
        item.unit,
        item.min_stock,
        item.supplier_id || null,
        item.unit_cost || null,
      ],
    );
  }

  /**
   * Update inventory properties.
   */
  static async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      unit?: string;
      min_stock?: number;
      supplier_id?: string | null;
      unit_cost?: number | null;
    },
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    await query(
      `UPDATE canteen_inventory SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Record stock movement (RESTOCK, USAGE, ADJUSTMENT) and log it atomically.
   */
  static async adjustStock(
    id: string,
    adjustment: {
      type: 'RESTOCK' | 'USAGE' | 'WASTE' | 'ADJUSTMENT';
      quantity: number; // positive = addition, negative = deduction
      note?: string | null;
      performed_by: number;
    },
  ): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Log transaction movement audit trail
      await conn.execute(
        `INSERT INTO canteen_inventory_log 
         (inventory_id, type, quantity, note, performed_by, created_at) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          id,
          adjustment.type,
          adjustment.quantity,
          adjustment.note || null,
          adjustment.performed_by,
        ],
      );

      // 2. Adjust physical stock levels on raw item
      // Also update last_restocked if type is RESTOCK
      const restockedField = adjustment.type === 'RESTOCK' ? ', last_restocked = NOW()' : '';
      await conn.execute(
        `UPDATE canteen_inventory SET stock = stock + ? ${restockedField} WHERE id = ?`,
        [adjustment.quantity, id],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Log food/ingredient waste with cost impact atomically.
   * Deducts quantity from inventory level and writes log.
   */
  static async logWaste(waste: {
    inventory_id?: string | null;
    item_name: string;
    quantity: number;
    unit: string;
    estimated_cost: number;
    reason: string;
    logged_by: number;
  }): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Insert waste record
      await conn.execute(
        `INSERT INTO canteen_waste_log 
         (inventory_id, item_name, quantity, unit, estimated_cost, reason, logged_by, logged_at, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, NOW())`,
        [
          waste.inventory_id || null,
          waste.item_name,
          waste.quantity,
          waste.unit,
          waste.estimated_cost,
          waste.reason,
          waste.logged_by,
        ],
      );

      // 2. If valid inventory item, write inventory log and deduct stock
      if (waste.inventory_id) {
        await conn.execute(
          `INSERT INTO canteen_inventory_log 
           (inventory_id, type, quantity, note, performed_by, created_at) 
           VALUES (?, 'WASTE', ?, ?, ?, NOW())`,
          [
            waste.inventory_id,
            -waste.quantity, // negative deduction
            `Waste logged: ${waste.reason}`,
            waste.logged_by,
          ],
        );

        await conn.execute(
          'UPDATE canteen_inventory SET stock = stock - ? WHERE id = ?',
          [waste.quantity, waste.inventory_id],
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
