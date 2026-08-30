import { query } from '@config/db';
import { ShopCategory } from '../../../types/shop.types';

export interface CategoryDbRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

export class ShopCategoriesModel {
  static formatRow(row: CategoryDbRow, count: number = 0): ShopCategory {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      imageUrl: row.image_url || '',
      count,
    };
  }

  static async listAll(): Promise<ShopCategory[]> {
    const sql = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM shop_categories c
      LEFT JOIN shop_products p ON (p.category_id = c.id OR p.category_id = c.slug)
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const rows = await query<any[]>(sql);
    return rows.map((r) => this.formatRow(r, Number(r.product_count || 0)));
  }

  static async findById(id: string): Promise<ShopCategory | null> {
    const rows = await query<CategoryDbRow[]>('SELECT * FROM shop_categories WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async findBySlug(slug: string): Promise<ShopCategory | null> {
    const rows = await query<CategoryDbRow[]>('SELECT * FROM shop_categories WHERE slug = ? LIMIT 1', [slug]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async create(data: { id: string; name: string; slug: string; description?: string; imageUrl?: string }): Promise<ShopCategory> {
    await query(
      'INSERT INTO shop_categories (id, name, slug, description, image_url) VALUES (?, ?, ?, ?, ?)',
      [data.id, data.name, data.slug, data.description || null, data.imageUrl || null],
    );
    const created = await this.findById(data.id);
    return created!;
  }

  static async update(id: string, data: { name?: string; slug?: string; description?: string; imageUrl?: string }): Promise<ShopCategory | null> {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.slug !== undefined) { fields.push('slug = ?'); values.push(data.slug); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.imageUrl !== undefined) { fields.push('image_url = ?'); values.push(data.imageUrl); }

    if (fields.length > 0) {
      values.push(id);
      await query(`UPDATE shop_categories SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return this.findById(id);
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM shop_categories WHERE id = ?', [id]);
  }
}
