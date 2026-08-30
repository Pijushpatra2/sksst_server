import { query } from '@config/db';
import { ShopProduct } from '../../types/shop.types';

export interface ProductDbRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  price: number;
  stock: number;
  images: string | null;
  rating: number;
  reviews_count: number;
  specs: string | null;
  is_featured: number | boolean;
  is_new: number | boolean;
  created_at: string;
  updated_at: string;
}

export class ProductsModel {
  static formatRow(row: ProductDbRow): ShopProduct {
    let parsedImages: string[] = [];
    if (row.images) {
      try {
        const decoded = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
        const array = Array.isArray(decoded) ? decoded : [decoded];
        parsedImages = array.filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
      } catch {
        if (typeof row.images === 'string' && row.images.trim().length > 0) {
          parsedImages = [row.images.trim()];
        }
      }
    }

    let parsedSpecs: Record<string, string> = {};
    if (row.specs) {
      try {
        parsedSpecs = typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs;
      } catch {
        parsedSpecs = {};
      }
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description || '',
      categoryId: row.category_id || 'cat-idols',
      price: Number(row.price),
      stock: Number(row.stock || 0),
      images: parsedImages,
      rating: Number(row.rating || 5.0),
      reviewsCount: Number(row.reviews_count || 0),
      specs: parsedSpecs,
      isFeatured: Boolean(row.is_featured),
      isNew: Boolean(row.is_new),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async listAll(filters?: { categoryId?: string; search?: string }): Promise<ShopProduct[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.categoryId && filters.categoryId !== 'all') {
      conditions.push('category_id = ?');
      values.push(filters.categoryId);
    }

    if (filters?.search && filters.search.trim()) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      values.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM shop_products ${whereClause} ORDER BY created_at DESC`;
    const rows = await query<ProductDbRow[]>(sql, values);
    return rows.map(this.formatRow);
  }

  static async findById(id: string): Promise<ShopProduct | null> {
    const rows = await query<ProductDbRow[]>('SELECT * FROM shop_products WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async findBySlug(slug: string): Promise<ShopProduct | null> {
    const rows = await query<ProductDbRow[]>('SELECT * FROM shop_products WHERE slug = ? LIMIT 1', [slug]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async create(product: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    categoryId?: string;
    price: number;
    stock?: number;
    images?: string[];
    rating?: number;
    reviewsCount?: number;
    specs?: Record<string, string>;
    isFeatured?: boolean;
    isNew?: boolean;
  }): Promise<ShopProduct> {
    const imagesJson = JSON.stringify(product.images || []);
    const specsJson = JSON.stringify(product.specs || {});

    await query(
      `INSERT INTO shop_products 
       (id, name, slug, description, category_id, price, stock, images, rating, reviews_count, specs, is_featured, is_new)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.name,
        product.slug,
        product.description || null,
        product.categoryId || 'cat-idols',
        product.price,
        product.stock ?? 0,
        imagesJson,
        product.rating ?? 5.0,
        product.reviewsCount ?? 0,
        specsJson,
        product.isFeatured ? 1 : 0,
        product.isNew !== undefined ? (product.isNew ? 1 : 0) : 1,
      ],
    );

    const created = await this.findById(product.id);
    return created!;
  }

  static async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      categoryId?: string;
      price?: number;
      stock?: number;
      images?: string[];
      rating?: number;
      reviewsCount?: number;
      specs?: Record<string, string>;
      isFeatured?: boolean;
      isNew?: boolean;
    },
  ): Promise<ShopProduct | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      fields.push('slug = ?');
      values.push(data.slug);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(data.categoryId);
    }
    if (data.price !== undefined) {
      fields.push('price = ?');
      values.push(data.price);
    }
    if (data.stock !== undefined) {
      fields.push('stock = ?');
      values.push(data.stock);
    }
    if (data.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(data.images));
    }
    if (data.rating !== undefined) {
      fields.push('rating = ?');
      values.push(data.rating);
    }
    if (data.reviewsCount !== undefined) {
      fields.push('reviews_count = ?');
      values.push(data.reviewsCount);
    }
    if (data.specs !== undefined) {
      fields.push('specs = ?');
      values.push(JSON.stringify(data.specs));
    }
    if (data.isFeatured !== undefined) {
      fields.push('is_featured = ?');
      values.push(data.isFeatured ? 1 : 0);
    }
    if (data.isNew !== undefined) {
      fields.push('is_new = ?');
      values.push(data.isNew ? 1 : 0);
    }

    if (fields.length > 0) {
      values.push(id);
      await query(`UPDATE shop_products SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return this.findById(id);
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM shop_products WHERE id = ?', [id]);
  }

  /**
   * Syncs / Upserts an item from canteen_menu_items when channel is 'e-com' or 'both'
   */
  static async upsertFromMenuItem(item: {
    id: string;
    name: string;
    category: string;
    price: number;
    description?: string;
    image_url?: string;
  }): Promise<void> {
    const existing = await this.findById(item.id);
    const categoryId = item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (existing) {
      const images = existing.images.length > 0
        ? existing.images
        : item.image_url ? [item.image_url] : [];

      await this.update(item.id, {
        name: item.name,
        slug: existing.slug || slug,
        categoryId,
        price: item.price,
        description: item.description || existing.description,
        images,
      });
    } else {
      const images = item.image_url ? [item.image_url] : [];
      await this.create({
        id: item.id,
        name: item.name,
        slug: `${slug}-${item.id.slice(0, 4)}`,
        description: item.description || '',
        categoryId,
        price: item.price,
        stock: 50,
        images,
        rating: 4.9,
        reviewsCount: 12,
        specs: { Origin: 'Temple Kitchen', Category: item.category },
        isFeatured: true,
        isNew: true,
      });
    }
  }
}
