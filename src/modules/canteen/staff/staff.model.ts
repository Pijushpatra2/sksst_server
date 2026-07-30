import { query } from '@config/db';
import { CanteenStaff } from '../../../types/canteen.types';

/**
 * Model helper queries for the `canteen_staff` table.
 */
export class StaffModel {
  /**
   * Find a staff member by email.
   */
  static async findByEmail(email: string): Promise<CanteenStaff | null> {
    const rows = await query<CanteenStaff[]>(
      'SELECT * FROM canteen_staff WHERE email = ? LIMIT 1',
      [email],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find a staff member by ID.
   */
  static async findById(id: number): Promise<CanteenStaff | null> {
    const rows = await query<CanteenStaff[]>(
      'SELECT * FROM canteen_staff WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Update last login timestamp.
   */
  static async updateLastLogin(id: number): Promise<void> {
    await query(
      'UPDATE canteen_staff SET last_login_at = NOW() WHERE id = ?',
      [id],
    );
  }

  /**
   * List all staff accounts.
   */
  static async listAll(): Promise<CanteenStaff[]> {
    return query<CanteenStaff[]>(
      'SELECT id, name, email, assigned_role, is_active, created_by, last_login_at, created_at, updated_at FROM canteen_staff ORDER BY id ASC',
    );
  }

  /**
   * Create a new staff account.
   */
  static async create(staff: {
    name: string;
    email: string;
    password_hash: string;
    assigned_role: string;
    created_by: number;
  }): Promise<number> {
    const result = await query<{ insertId: number } | any>(
      `INSERT INTO canteen_staff 
       (name, email, password_hash, assigned_role, is_active, created_by) 
       VALUES (?, ?, ?, ?, 1, ?)`,
      [staff.name, staff.email, staff.password_hash, staff.assigned_role, staff.created_by],
    );
    return result.insertId;
  }

  /**
   * Update a staff account.
   */
  static async update(
    id: number,
    data: {
      name?: string;
      assigned_role?: string;
      is_active?: number;
      password_hash?: string;
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
      `UPDATE canteen_staff SET ${fields.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Soft-deactivate a staff member.
   */
  static async deactivate(id: number): Promise<void> {
    await query(
      'UPDATE canteen_staff SET is_active = 0 WHERE id = ?',
      [id],
    );
  }
}
