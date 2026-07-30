import { query } from '@config/db';
import { CanteenTable } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_tables` table.
 */
export class TableModel {
  /**
   * Find a table by ID.
   */
  static async findById(id: string): Promise<CanteenTable | null> {
    const rows = await query<CanteenTable[]>(
      'SELECT * FROM canteen_tables WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List all active tables.
   */
  static async listActive(): Promise<CanteenTable[]> {
    return query<CanteenTable[]>(
      'SELECT * FROM canteen_tables WHERE is_active = 1 ORDER BY name ASC',
    );
  }

  /**
   * Create a new table.
   */
  static async create(table: {
    id: string;
    name: string;
    capacity: number;
    location_zone?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO canteen_tables 
       (id, name, capacity, status, current_bill, location_zone, is_active) 
       VALUES (?, ?, ?, 'AVAILABLE', 0.00, ?, 1)`,
      [table.id, table.name, table.capacity, table.location_zone || null],
    );
  }

  /**
   * Update table status, current bill, occupied timestamp, or other details.
   */
  static async update(
    id: string,
    data: {
      name?: string;
      capacity?: number;
      status?: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';
      current_bill?: number;
      occupied_since?: Date | null;
      location_zone?: string | null;
      is_active?: number;
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
      `UPDATE canteen_tables SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Permanently delete a table from the database.
   */
  static async deactivate(id: string): Promise<void> {
    // Delete bookings referencing the table (table_id cannot be NULL)
    await query('DELETE FROM canteen_bookings WHERE table_id = ?', [id]);
    
    // Unlink table references from orders to prevent foreign key failures
    await query('UPDATE canteen_orders SET table_id = NULL WHERE table_id = ?', [id]);
    
    // Hard delete the table
    await query('DELETE FROM canteen_tables WHERE id = ?', [id]);
  }
}
