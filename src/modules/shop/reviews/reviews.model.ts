import { query } from '@config/db';
import { generateUUID } from '@utils/tokenGenerator';
import { ShopReview } from '../../../types/shop.types';

export interface ReviewDbRow {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  verified_purchase: number | boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  product_name?: string;
}

export class ShopReviewsModel {
  static formatRow(row: ReviewDbRow): ShopReview {
    return {
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      customerName: row.customer_name,
      rating: Number(row.rating),
      comment: row.comment,
      verifiedPurchase: Boolean(row.verified_purchase),
      status: row.status,
      createdAt: row.created_at,
    };
  }

  static async listAll(): Promise<ShopReview[]> {
    const sql = `
      SELECT r.*, p.name as product_name
      FROM shop_reviews r
      LEFT JOIN shop_products p ON p.id = r.product_id
      ORDER BY r.created_at DESC
    `;
    const rows = await query<ReviewDbRow[]>(sql);
    return rows.map(this.formatRow);
  }

  static async listByProduct(productId: string): Promise<ShopReview[]> {
    const sql = `
      SELECT r.*, p.name as product_name
      FROM shop_reviews r
      LEFT JOIN shop_products p ON p.id = r.product_id
      WHERE r.product_id = ? AND r.status = 'APPROVED'
      ORDER BY r.created_at DESC
    `;
    const rows = await query<ReviewDbRow[]>(sql, [productId]);
    return rows.map(this.formatRow);
  }

  static async findById(id: string): Promise<ShopReview | null> {
    const rows = await query<ReviewDbRow[]>('SELECT * FROM shop_reviews WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async create(data: {
    productId: string;
    customerName: string;
    rating: number;
    comment: string;
    verifiedPurchase?: boolean;
  }): Promise<ShopReview> {
    const id = generateUUID();
    await query(
      `INSERT INTO shop_reviews (id, product_id, customer_name, rating, comment, verified_purchase, status)
       VALUES (?, ?, ?, ?, ?, ?, 'APPROVED')`,
      [id, data.productId, data.customerName, data.rating, data.comment, data.verifiedPurchase ? 1 : 0],
    );

    // Recalculate and update product rating and reviews_count
    try {
      const stats = await query<any[]>(
        'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM shop_reviews WHERE product_id = ? AND status = "APPROVED"',
        [data.productId],
      );
      if (stats.length > 0) {
        const count = Number(stats[0].count || 0);
        const avg = Number(stats[0].avg_rating || 5.0).toFixed(1);
        await query('UPDATE shop_products SET rating = ?, reviews_count = ? WHERE id = ?', [avg, count, data.productId]);
      }
    } catch (e) {
      console.error('Failed to update product review stats:', e);
    }

    return (await this.findById(id))!;
  }

  static async delete(id: string): Promise<void> {
    const review = await this.findById(id);
    await query('DELETE FROM shop_reviews WHERE id = ?', [id]);

    if (review) {
      try {
        const stats = await query<any[]>(
          'SELECT COUNT(*) as count, AVG(rating) as avg_rating FROM shop_reviews WHERE product_id = ? AND status = "APPROVED"',
          [review.productId],
        );
        if (stats.length > 0) {
          const count = Number(stats[0].count || 0);
          const avg = count > 0 ? Number(stats[0].avg_rating).toFixed(1) : '5.0';
          await query('UPDATE shop_products SET rating = ?, reviews_count = ? WHERE id = ?', [avg, count, review.productId]);
        }
      } catch (e) {}
    }
  }
}
