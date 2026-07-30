import { query } from '@config/db';

export interface WebsiteStaffUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Model helper queries for the `website_staff` table.
 */
export class WebsiteStaffModel {
  /**
   * Find website staff by email.
   */
  static async findByEmail(email: string): Promise<WebsiteStaffUser | null> {
    const rows = await query<WebsiteStaffUser[]>(
      'SELECT * FROM website_staff WHERE email = ? LIMIT 1',
      [email],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find website staff by ID.
   */
  static async findById(id: number): Promise<WebsiteStaffUser | null> {
    const rows = await query<WebsiteStaffUser[]>(
      'SELECT * FROM website_staff WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * List all website staff (excluding passwords).
   */
  static async listAll(): Promise<Omit<WebsiteStaffUser, 'password_hash'>[]> {
    return query<Omit<WebsiteStaffUser, 'password_hash'>[]>(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM website_staff ORDER BY id DESC',
    );
  }

  /**
   * Insert new website staff record.
   */
  static async create(staff: {
    name: string;
    email: string;
    password_hash: string;
    role: string;
  }): Promise<number> {
    const result = await query<any>(
      `INSERT INTO website_staff (name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [staff.name, staff.email, staff.password_hash, staff.role],
    );
    return result.insertId;
  }

  /**
   * Update an existing staff record.
   */
  static async update(
    id: number,
    updates: Partial<Omit<WebsiteStaffUser, 'id' | 'password_hash' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    const setClause: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, val]) => {
      setClause.push(`${key} = ?`);
      values.push(val);
    });

    if (setClause.length === 0) return;

    values.push(id);

    await query(
      `UPDATE website_staff SET ${setClause.join(', ')} WHERE id = ?`,
      values,
    );
  }

  /**
   * Delete a staff record.
   */
  static async delete(id: number): Promise<void> {
    await query('DELETE FROM website_staff WHERE id = ?', [id]);
  }
}
