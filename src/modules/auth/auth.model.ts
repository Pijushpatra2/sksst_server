import { query } from '@config/db';
import { AdminUser } from '../../types/canteen.types';

/**
 * Model helper queries for the global `admin_users` table.
 */
export class AdminModel {
  /**
   * Find an administrator by their unique email address.
   */
  static async findByEmail(email: string): Promise<AdminUser | null> {
    const rows = await query<AdminUser[]>(
      'SELECT * FROM admin_users WHERE email = ? LIMIT 1',
      [email],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find an administrator by their primary key ID.
   */
  static async findById(id: number): Promise<AdminUser | null> {
    const rows = await query<AdminUser[]>(
      'SELECT * FROM admin_users WHERE id = ? LIMIT 1',
      [id],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Update the last_login_at timestamp when an admin successfully authenticates.
   */
  static async updateLastLogin(id: number): Promise<void> {
    await query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = ?',
      [id],
    );
  }

  /**
   * Update the password hash of an administrator.
   */
  static async updatePassword(id: number, hash: string): Promise<void> {
    await query(
      'UPDATE admin_users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hash, id],
    );
  }
}
