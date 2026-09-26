import { pool } from '@config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Shopkeeper, ShopkeeperStats } from '../../types/shop.types';

export class ShopkeeperModel {
  /**
   * Find a shopkeeper by their unique ID.
   */
  static async findById(id: string): Promise<Shopkeeper | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM shopkeepers WHERE id = ? LIMIT 1`,
      [id]
    );
    return (rows[0] as Shopkeeper) || null;
  }

  /**
   * Find a shopkeeper by email.
   */
  static async findByEmail(email: string): Promise<Shopkeeper | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM shopkeepers WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email.trim()]
    );
    return (rows[0] as Shopkeeper) || null;
  }

  /**
   * Find a shopkeeper by phone.
   */
  static async findByPhone(phone: string): Promise<Shopkeeper | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM shopkeepers WHERE phone = ? LIMIT 1`,
      [phone.trim()]
    );
    return (rows[0] as Shopkeeper) || null;
  }

  /**
   * List all shopkeepers for admin dashboard.
   */
  static async listAll(): Promise<Omit<Shopkeeper, 'password_hash'>[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, email, phone, role, store_name, status, is_active, avatar_url, address, created_by, created_at, updated_at, last_login 
       FROM shopkeepers 
       ORDER BY created_at DESC`
    );
    return rows as Omit<Shopkeeper, 'password_hash'>[];
  }

  /**
   * Create a new shopkeeper account.
   */
  static async create(data: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    password_hash: string;
    role?: string;
    store_name?: string | null;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    is_active?: boolean | number;
    address?: string | null;
    created_by?: number | null;
  }): Promise<Shopkeeper> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO shopkeepers (id, name, email, phone, password_hash, role, store_name, status, is_active, address, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.name.trim(),
        data.email.trim().toLowerCase(),
        data.phone ? data.phone.trim() : null,
        data.password_hash,
        data.role || 'SHOPKEEPER',
        data.store_name || 'Main Temple Gift & Book Store',
        data.status || 'ACTIVE',
        data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
        data.address || null,
        data.created_by || null,
      ]
    );

    const created = await this.findById(data.id);
    if (!created) {
      throw new Error('Failed to retrieve created shopkeeper record');
    }
    return created;
  }

  /**
   * Update shopkeeper details.
   */
  static async update(id: string, updates: Partial<Shopkeeper>): Promise<void> {
    const allowedFields = [
      'name',
      'phone',
      'store_name',
      'status',
      'is_active',
      'avatar_url',
      'address',
      'password_hash',
      'last_login',
    ];

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`\`${key}\` = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return;

    values.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE shopkeepers SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Delete shopkeeper.
   */
  static async delete(id: string): Promise<void> {
    await pool.query<ResultSetHeader>(
      `DELETE FROM shopkeepers WHERE id = ?`,
      [id]
    );
  }

  /**
   * Aggregate store statistics for shopkeeper dashboard.
   */
  static async getShopkeeperStats(): Promise<ShopkeeperStats> {
    // 1. Order stats
    const [orderRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN status = 'PENDING' OR status = 'PROCESSING' THEN 1 ELSE 0 END) as pendingOrders,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as deliveredOrders,
        COALESCE(SUM(total), 0) as totalRevenueUGX,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) as todaySalesUGX
       FROM shop_orders`
    );

    // 2. Product stats
    const [productRows] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalProducts,
        SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) as lowStockProducts
       FROM shop_products`
    );

    // 3. Customer stats
    const [customerRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as totalCustomers FROM shop_customers`
    );

    const o = orderRows[0] || {};
    const p = productRows[0] || {};
    const c = customerRows[0] || {};

    return {
      totalOrders: Number(o.totalOrders || 0),
      pendingOrders: Number(o.pendingOrders || 0),
      deliveredOrders: Number(o.deliveredOrders || 0),
      totalProducts: Number(p.totalProducts || 0),
      lowStockProducts: Number(p.lowStockProducts || 0),
      totalCustomers: Number(c.totalCustomers || 0),
      todaySalesUGX: Number(o.todaySalesUGX || 0),
      totalRevenueUGX: Number(o.totalRevenueUGX || 0),
    };
  }
}
