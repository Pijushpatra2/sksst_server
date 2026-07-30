import { query } from '@config/db';

export interface CanteenCategory {
  id: number;
  name: string;
  created_at: Date;
}

/**
 * Model helper queries for the `canteen_categories` table.
 */
export class CategoriesModel {
  /**
   * List all canteen categories.
   */
  static async listAll(): Promise<CanteenCategory[]> {
    return query<CanteenCategory[]>('SELECT * FROM canteen_categories ORDER BY name ASC');
  }

  /**
   * Find a category by ID.
   */
  static async findById(id: number): Promise<CanteenCategory | null> {
    const rows = await query<CanteenCategory[]>(
      'SELECT * FROM canteen_categories WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a category by unique name.
   */
  static async findByName(name: string): Promise<CanteenCategory | null> {
    const rows = await query<CanteenCategory[]>(
      'SELECT * FROM canteen_categories WHERE name = ? LIMIT 1',
      [name],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Create a new category.
   */
  static async create(name: string): Promise<number> {
    const result = await query<any>(
      'INSERT INTO canteen_categories (name) VALUES (?)',
      [name],
    );
    return result.insertId;
  }

  /**
   * Delete a category.
   */
  static async delete(id: number): Promise<void> {
    await query('DELETE FROM canteen_categories WHERE id = ?', [id]);
  }

  /**
   * Update category name.
   */
  static async update(id: number, name: string): Promise<void> {
    await query('UPDATE canteen_categories SET name = ? WHERE id = ?', [name, id]);
  }
}
