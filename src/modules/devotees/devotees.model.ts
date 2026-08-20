import { pool, query } from '@config/db';
import { Devotee } from '../../types/devotee.types';

export class DevoteeModel {
  /**
   * Inserts a new devotee record.
   */
  static async create(devotee: Partial<Devotee>): Promise<Devotee> {
    const sql = `
      INSERT INTO devotees (
        id, first_name, last_name, email, phone, password_hash,
        membership_number, membership_type, status, joined_date, valid_until, qr_code_url
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
    `;
    const params = [
      devotee.id,
      devotee.first_name,
      devotee.last_name,
      devotee.email,
      devotee.phone,
      devotee.password_hash,
      devotee.membership_number,
      devotee.membership_type,
      devotee.status,
      devotee.joined_date,
      devotee.valid_until,
      devotee.qr_code_url
    ];
    
    await pool.query(sql, params);
    const created = await this.findById(devotee.id!);
    if (!created) {
      throw new Error('Failed to retrieve newly created devotee profile');
    }
    return created;
  }

  /**
   * Find by Primary Key ID.
   */
  static async findById(id: string): Promise<Devotee | null> {
    const sql = 'SELECT * FROM devotees WHERE id = ? LIMIT 1';
    const rows = await query<Devotee[]>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find by unique Email.
   */
  static async findByEmail(email: string): Promise<Devotee | null> {
    const sql = 'SELECT * FROM devotees WHERE email = ? LIMIT 1';
    const rows = await query<Devotee[]>(sql, [email]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find by unique Phone.
   */
  static async findByPhone(phone: string): Promise<Devotee | null> {
    const sql = 'SELECT * FROM devotees WHERE phone = ? LIMIT 1';
    const rows = await query<Devotee[]>(sql, [phone]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Find devotee by either email or phone.
   */
  static async findByEmailOrPhone(emailOrPhone: string): Promise<Devotee | null> {
    const sql = 'SELECT * FROM devotees WHERE email = ? OR phone = ? LIMIT 1';
    const rows = await query<Devotee[]>(sql, [emailOrPhone, emailOrPhone]);
    return rows.length > 0 ? rows[0] : null;
  }
}
