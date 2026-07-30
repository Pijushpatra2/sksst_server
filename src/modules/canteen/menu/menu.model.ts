import { query } from '@config/db';
import { CanteenMenuItem } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_menu_items` table.
 */
export class MenuModel {
  /**
   * Find a menu item by ID.
   */
  static async findById(id: string): Promise<CanteenMenuItem | null> {
    const rows = await query<CanteenMenuItem[]>(
      'SELECT * FROM canteen_menu_items WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List all menu items with category/variety filters.
   */
  static async listFiltered(filters: {
    category?: string;
    variety?: string;
    available?: number;
    channel?: string;
  }): Promise<CanteenMenuItem[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.category) {
      conditions.push('category = ?');
      values.push(filters.category);
    }
    if (filters.variety) {
      conditions.push('variety = ?');
      values.push(filters.variety);
    }
    if (filters.available !== undefined) {
      conditions.push('available = ?');
      values.push(filters.available);
    }
    if (filters.channel) {
      if (filters.channel === 'canteen') {
        conditions.push("channel IN ('canteen', 'both')");
      } else if (filters.channel === 'e-com') {
        conditions.push("channel IN ('e-com', 'both')");
      } else {
        conditions.push('channel = ?');
        values.push(filters.channel);
      }
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND name NOT LIKE '[Deleted]%'`
        : `WHERE name NOT LIKE '[Deleted]%'`;
    const sql = `SELECT * FROM canteen_menu_items ${whereClause} ORDER BY sort_order ASC, name ASC`;

    return query<CanteenMenuItem[]>(sql, values);
  }

  /**
   * Create a new menu item.
   */
  static async create(item: {
    id: string;
    name: string;
    price: number;
    category: string;
    variety: string;
    description?: string;
    image_url?: string;
    available?: number;
    sort_order?: number;
    channel?: string;
  }): Promise<void> {
    await query(
      `INSERT INTO canteen_menu_items 
       (id, name, price, category, variety, description, image_url, available, sort_order, channel) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.price,
        item.category,
        item.variety,
        item.description || null,
        item.image_url || null,
        item.available !== undefined ? item.available : 1,
        item.sort_order || 0,
        item.channel || 'canteen',
      ],
    );
  }

  /**
   * Update a menu item.
   */
  static async update(
    id: string,
    data: {
      name?: string;
      price?: number;
      category?: string;
      variety?: string;
      description?: string | null;
      image_url?: string | null;
      available?: number;
      sort_order?: number;
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
      `UPDATE canteen_menu_items SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Soft-delete a menu item that has FK references in canteen_order_items.
   * Marks the item unavailable and prefixes its name so it is hidden from the
   * POS grid while historical order records remain intact.
   */
  static async softDelete(id: string): Promise<void> {
    await query(
      `UPDATE canteen_menu_items
         SET available = 0,
             name      = CONCAT('[Deleted] ', name)
       WHERE id = ? AND name NOT LIKE '[Deleted]%'`,
      [id],
    );
  }

  /**
   * Hard-delete a menu item (only safe when no order_items reference it).
   */
  static async delete(id: string): Promise<void> {
    await query(
      'DELETE FROM canteen_menu_items WHERE id = ?',
      [id],
    );
  }
}
