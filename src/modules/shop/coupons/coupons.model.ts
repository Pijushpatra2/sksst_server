import { query } from '@config/db';
import { generateUUID } from '@utils/tokenGenerator';
import { ShopCoupon } from '../../../types/shop.types';

export interface CouponDbRow {
  id: string;
  code: string;
  discount_type: 'PERCENT' | 'FIXED';
  value: number;
  min_spend: number;
  description: string | null;
  active: number | boolean;
  expires_at: string | null;
}

export class ShopCouponsModel {
  static formatRow(row: CouponDbRow): ShopCoupon {
    return {
      id: row.id,
      code: row.code,
      discountType: row.discount_type,
      value: Number(row.value),
      minSpend: Number(row.min_spend || 0),
      description: row.description || '',
      active: Boolean(row.active),
      expiresAt: row.expires_at,
    };
  }

  static async listAll(): Promise<ShopCoupon[]> {
    const rows = await query<CouponDbRow[]>('SELECT * FROM shop_coupons ORDER BY created_at DESC');
    return rows.map(this.formatRow);
  }

  static async findById(id: string): Promise<ShopCoupon | null> {
    const rows = await query<CouponDbRow[]>('SELECT * FROM shop_coupons WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async findByCode(code: string): Promise<ShopCoupon | null> {
    const cleanCode = code.trim().toUpperCase();
    const rows = await query<CouponDbRow[]>('SELECT * FROM shop_coupons WHERE code = ? LIMIT 1', [cleanCode]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async create(data: {
    code: string;
    discountType: 'PERCENT' | 'FIXED';
    value: number;
    minSpend?: number;
    description?: string;
  }): Promise<ShopCoupon> {
    const id = generateUUID();
    const cleanCode = data.code.trim().toUpperCase().replace(/\s+/g, '');
    await query(
      `INSERT INTO shop_coupons (id, code, discount_type, value, min_spend, description, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [id, cleanCode, data.discountType, data.value, data.minSpend || 0, data.description || null],
    );
    return (await this.findById(id))!;
  }

  static async toggle(id: string): Promise<ShopCoupon | null> {
    await query('UPDATE shop_coupons SET active = NOT active WHERE id = ?', [id]);
    return this.findById(id);
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM shop_coupons WHERE id = ?', [id]);
  }
}
