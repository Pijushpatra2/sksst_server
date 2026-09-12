import { pool, query } from '@config/db';
import { Devotee, UpdateDevoteeProfileDto } from '../../types/devotee.types';

export class DevoteeModel {
  /**
   * Inserts a new devotee record.
   */
  static async create(devotee: Partial<Devotee>): Promise<Devotee> {
    const sql = `
      INSERT INTO devotees (
        id, first_name, last_name, email, phone, password_hash,
        membership_number, membership_type, status, joined_date, valid_until, qr_code_url,
        address, city, country, postal_code, family_members, avatar_url, is_active
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
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
      devotee.membership_type || 'Annual',
      devotee.status || 'ACTIVE',
      devotee.joined_date,
      devotee.valid_until,
      devotee.qr_code_url || null,
      devotee.address || null,
      devotee.city || null,
      devotee.country || 'Uganda',
      devotee.postal_code || null,
      devotee.family_members || null,
      devotee.avatar_url || null,
      devotee.is_active !== undefined ? (devotee.is_active ? 1 : 0) : 1
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
   * Find by unique Membership Number (for QR Scanning and admin checks).
   */
  static async findByMembershipNumber(membershipNumber: string): Promise<Devotee | null> {
    const sql = 'SELECT * FROM devotees WHERE membership_number = ? LIMIT 1';
    const rows = await query<Devotee[]>(sql, [membershipNumber]);
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

  /**
   * Updates devotee profile details (email is strictly excluded and cannot be updated).
   */
  static async updateProfile(id: string, updates: UpdateDevoteeProfileDto): Promise<Devotee> {
    const allowedFields: (keyof UpdateDevoteeProfileDto)[] = [
      'first_name',
      'last_name',
      'phone',
      'address',
      'city',
      'country',
      'postal_code',
      'family_members',
      'avatar_url',
    ];

    const setClauses: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Devotee profile not found');
      return existing;
    }

    params.push(id);
    const sql = `UPDATE devotees SET ${setClauses.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated devotee profile');
    }
    return updated;
  }

  /**
   * Retrieve all devotees for admin view/audit.
   */
  static async listAll(): Promise<Devotee[]> {
    const sql = 'SELECT * FROM devotees ORDER BY created_at DESC';
    return await query<Devotee[]>(sql);
  }
}
