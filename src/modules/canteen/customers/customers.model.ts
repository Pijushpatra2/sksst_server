import { query } from '@config/db';
import { CanteenCustomer, PaginatedResult } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_customers` table.
 */
export class CustomerModel {
  /**
   * Find a devotee customer by ID.
   */
  static async findById(id: string): Promise<CanteenCustomer | null> {
    const rows = await query<CanteenCustomer[]>(
      'SELECT * FROM canteen_customers WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a devotee customer by phone.
   */
  static async findByPhone(phone: string): Promise<CanteenCustomer | null> {
    const rows = await query<CanteenCustomer[]>(
      'SELECT * FROM canteen_customers WHERE phone = ? LIMIT 1',
      [phone],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List/search devotee customers with pagination.
   */
  static async listPaginated(params: {
    search?: string;
    customer_type?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<CanteenCustomer>> {
    const offset = (params.page - 1) * params.limit;
    const conditions: string[] = ['is_active = 1'];
    const values: any[] = [];

    if (params.search) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      const wild = `%${params.search}%`;
      values.push(wild, wild, wild);
    }

    if (params.customer_type) {
      conditions.push('customer_type = ?');
      values.push(params.customer_type);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Get total count
    const countSql = `SELECT COUNT(*) AS total FROM canteen_customers ${whereClause}`;
    const countRows = await query<{ total: number }[]>(countSql, values);
    const total = countRows[0]?.total || 0;

    // Get paginated data
    const limitVal = Math.max(1, Math.min(1000, Number(params.limit) || 20));
    const offsetVal = Math.max(0, Number(offset) || 0);
    const dataSql = `
      SELECT * FROM canteen_customers 
      ${whereClause} 
      ORDER BY total_spent DESC, name ASC 
      LIMIT ${limitVal} OFFSET ${offsetVal}`;
    
    const data = await query<CanteenCustomer[]>(dataSql, values);

    const totalPages = Math.ceil(total / params.limit);

    return {
      data,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Register a new devotee customer.
   */
  static async create(customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    customer_type: string;
    notes?: string | null;
  }): Promise<void> {
    await query(
      `INSERT INTO canteen_customers 
       (id, name, phone, email, customer_type, total_orders, total_visits, total_spent, notes, is_active) 
       VALUES (?, ?, ?, ?, ?, 0, 0, 0.00, ?, 1)`,
      [
        customer.id,
        customer.name,
        customer.phone,
        customer.email || null,
        customer.customer_type,
        customer.notes || null,
      ],
    );
  }

  /**
   * Update devotee customer profile details or statistics.
   */
  static async update(
    id: string,
    data: {
      name?: string;
      phone?: string;
      email?: string | null;
      customer_type?: string;
      total_orders?: number;
      total_visits?: number;
      total_spent?: number;
      last_visit?: Date | null;
      notes?: string | null;
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
      `UPDATE canteen_customers SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Soft-delete/deactivate a customer record.
   */
  static async deactivate(id: string): Promise<void> {
    await query(
      'UPDATE canteen_customers SET is_active = 0 WHERE id = ?',
      [id],
    );
  }
}
