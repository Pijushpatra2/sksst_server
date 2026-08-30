import { query } from '@config/db';
import { generateUUID } from '@utils/tokenGenerator';
import { ShopCustomer } from '../../../types/shop.types';

export interface CustomerDbRow {
  id: string;
  devotee_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  total_spent: number;
  orders_count: number;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export class ShopCustomersModel {
  static formatRow(row: CustomerDbRow): ShopCustomer {
    return {
      id: row.id,
      devoteeId: row.devotee_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      totalSpent: Number(row.total_spent || 0),
      ordersCount: Number(row.orders_count || 0),
      address: row.address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async listAll(search?: string): Promise<ShopCustomer[]> {
    let sql = 'SELECT * FROM shop_customers';
    const values: any[] = [];
    if (search && search.trim()) {
      sql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      const term = `%${search.trim()}%`;
      values.push(term, term, term);
    }
    sql += ' ORDER BY total_spent DESC, created_at DESC';
    const rows = await query<CustomerDbRow[]>(sql, values);
    return rows.map(this.formatRow);
  }

  static async findById(id: string): Promise<ShopCustomer | null> {
    const rows = await query<CustomerDbRow[]>('SELECT * FROM shop_customers WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async findByEmail(email: string): Promise<ShopCustomer | null> {
    const rows = await query<CustomerDbRow[]>('SELECT * FROM shop_customers WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    return rows.length > 0 ? this.formatRow(rows[0]) : null;
  }

  static async upsertFromOrder(data: {
    name: string;
    email: string;
    phone?: string;
    devoteeId?: string;
    orderTotal: number;
    address?: string;
  }): Promise<ShopCustomer> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      const newTotal = Number(existing.totalSpent) + Number(data.orderTotal);
      const newCount = Number(existing.ordersCount) + 1;
      await query(
        `UPDATE shop_customers 
         SET name = ?, phone = COALESCE(?, phone), devotee_id = COALESCE(?, devotee_id),
             address = COALESCE(?, address), total_spent = ?, orders_count = ?
         WHERE id = ?`,
        [data.name, data.phone || null, data.devoteeId || null, data.address || null, newTotal, newCount, existing.id],
      );
      return (await this.findById(existing.id))!;
    } else {
      const id = generateUUID();
      await query(
        `INSERT INTO shop_customers (id, devotee_id, name, email, phone, total_spent, orders_count, address)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [id, data.devoteeId || null, data.name, data.email.trim().toLowerCase(), data.phone || null, data.orderTotal, data.address || null],
      );
      return (await this.findById(id))!;
    }
  }
}
