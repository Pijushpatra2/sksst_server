import { ApiError } from '@utils/ApiError';
import { comparePassword, hashPassword } from '@utils/bcrypt';
import { query } from '@config/db';
import {
  signAdminAccessToken,
  signAdminRefreshToken,
  verifyAdminRefreshToken,
} from '@utils/jwt';
import { AdminModel } from './auth.model';
import { WebsiteStaffModel } from './websiteStaff.model';
import { LoginInput, UpdatePasswordInput } from './auth.validator';
import { AdminJwtPayload } from '../../types/canteen.types';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: {
    id: number;
    name: string;
    email: string;
    role: string;
    moduleScope: string | null;
  };
}

/**
 * Service layer for global admin authentication.
 * Handles bcrypt comparison, database lookup, and JWT creation/refreshing.
 */
export class AuthService {
  /**
   * Log in an administrator (either global admin or website staff).
   */
  static async login(input: LoginInput): Promise<LoginResponse> {
    let admin = await AdminModel.findByEmail(input.email);
    let isStaff = false;

    if (!admin) {
      // Fallback: check website_staff
      admin = await WebsiteStaffModel.findByEmail(input.email) as any;
      isStaff = true;
    }

    if (!admin) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!admin.is_active) {
      throw ApiError.forbidden('Your account has been deactivated');
    }

    // Verify password hash
    const isMatch = await comparePassword(input.password, admin.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login timestamp asynchronously
    if (!isStaff) {
      AdminModel.updateLastLogin(admin.id).catch((err) =>
        console.error(`Failed to update last login for admin ${admin.id}:`, err),
      );
    } else {
      WebsiteStaffModel.update(admin.id, {}).catch((err) =>
        console.error(`Failed to update last login for staff ${admin.id}:`, err),
      );
    }

    // Create JWT payloads
    const payload: AdminJwtPayload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      moduleScope: (admin as any).module_scope ?? null,
    };

    const accessToken  = signAdminAccessToken(payload);
    const refreshToken = signAdminRefreshToken({ id: admin.id, isStaff });

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        moduleScope: (admin as any).module_scope ?? null,
      },
    };
  }

  /**
   * Exchange a valid refresh token for a brand new access token.
   */
  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyAdminRefreshToken(token);
      let admin: any = null;

      if (decoded.isStaff) {
        admin = await WebsiteStaffModel.findById(decoded.id);
      } else {
        admin = await AdminModel.findById(decoded.id);
      }

      if (!admin) {
        throw ApiError.unauthorized('Invalid session user');
      }

      if (!admin.is_active) {
        throw ApiError.forbidden('Your account is deactivated');
      }

      const payload: AdminJwtPayload = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        moduleScope: admin.module_scope ?? null,
      };

      const accessToken = signAdminAccessToken(payload);
      const refreshToken = signAdminRefreshToken({
        id: admin.id,
        isStaff: decoded.isStaff,
      });

      return { accessToken, refreshToken };
    } catch (err) {
      throw ApiError.unauthorized('Refresh token is expired or invalid');
    }
  }

  /**
   * Fetch current admin profile info.
   */
  static async getProfile(id: number) {
    let admin = await AdminModel.findById(id);

    if (!admin) {
      admin = await WebsiteStaffModel.findById(id) as any;
    }

    if (!admin) {
      throw ApiError.notFound('Admin profile not found');
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      moduleScope: (admin as any).module_scope ?? null,
      lastLoginAt: admin.last_login_at,
      createdAt: admin.created_at,
    };
  }

  /**
   * Change admin password.
   */
  static async changePassword(
    id: number,
    input: UpdatePasswordInput,
  ): Promise<void> {
    let admin = await AdminModel.findById(id);
    let isStaff = false;

    if (!admin) {
      admin = await WebsiteStaffModel.findById(id) as any;
      isStaff = true;
    }

    if (!admin) {
      throw ApiError.notFound('Admin user not found');
    }

    const isMatch = await comparePassword(input.oldPassword, admin.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Incorrect old password');
    }

    const hash = await hashPassword(input.newPassword);
    
    if (!isStaff) {
      await AdminModel.updatePassword(id, hash);
    } else {
      await query('UPDATE website_staff SET password_hash = ? WHERE id = ?', [hash, id]);
    }
  }

  /**
   * List all system admins & website staff for dynamic roster dashboard.
   */
  static async listAdmins() {
    // 1. Get global admin_users
    const admins = await query<any[]>(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM admin_users ORDER BY id DESC'
    );
    // 2. Get website_staff
    const staff = await WebsiteStaffModel.listAll();

    // Map and prefix IDs to prevent duplicate keys in UI
    const mappedAdmins = admins.map(a => ({
      id: `admin-${a.id}`,
      name: a.name,
      email: a.email,
      role: a.role,
      isActive: !!a.is_active,
      isGlobal: true,
      createdAt: a.created_at
    }));

    const mappedStaff = staff.map(s => ({
      id: `staff-${s.id}`,
      name: s.name,
      email: s.email,
      role: s.role,
      isActive: !!s.is_active,
      isGlobal: false,
      createdAt: s.created_at
    }));

    return [...mappedAdmins, ...mappedStaff];
  }

  /**
   * Create a new website staff administrator.
   */
  static async createAdmin(input: { name: string; email: string; role: string; password?: string }) {
    const email = input.email.trim().toLowerCase();
    
    // Check uniqueness across both tables
    const existingAdmin = await AdminModel.findByEmail(email);
    const existingStaff = await WebsiteStaffModel.findByEmail(email);
    if (existingAdmin || existingStaff) {
      throw ApiError.badRequest('Email address is already in use');
    }

    const password = input.password || 'swami123';
    const hash = await hashPassword(password);

    const insertId = await WebsiteStaffModel.create({
      name: input.name,
      email,
      password_hash: hash,
      role: input.role.toLowerCase(),
    });

    return {
      id: `staff-${insertId}`,
      name: input.name,
      email,
      role: input.role,
      isActive: true,
      isGlobal: false,
    };
  }

  /**
   * Update an existing admin/staff record.
   */
  static async updateAdmin(prefixedId: string, updates: any) {
    const isGlobal = prefixedId.startsWith('admin-');
    const id = parseInt(prefixedId.replace(/^(admin|staff)-/, ''), 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid administrator ID format');
    }

    if (updates.email) {
      const email = updates.email.trim().toLowerCase();
      // Check uniqueness
      const existingAdmin = await AdminModel.findByEmail(email);
      const existingStaff = await WebsiteStaffModel.findByEmail(email);
      if (isGlobal) {
        if (existingAdmin && existingAdmin.id !== id) throw ApiError.badRequest('Email already in use');
        if (existingStaff) throw ApiError.badRequest('Email already in use');
      } else {
        if (existingStaff && existingStaff.id !== id) throw ApiError.badRequest('Email already in use');
        if (existingAdmin) throw ApiError.badRequest('Email already in use');
      }
    }

    // Build update payload
    const activeVal = updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : undefined;
    
    if (isGlobal) {
      // For global admins: update role, is_active, name, email
      const setClause: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) { setClause.push('name = ?'); values.push(updates.name); }
      if (updates.email !== undefined) { setClause.push('email = ?'); values.push(updates.email.trim().toLowerCase()); }
      if (updates.role !== undefined) { setClause.push('role = ?'); values.push(updates.role.toLowerCase()); }
      if (activeVal !== undefined) { setClause.push('is_active = ?'); values.push(activeVal); }

      if (setClause.length > 0) {
        values.push(id);
        await query(`UPDATE admin_users SET ${setClause.join(', ')} WHERE id = ?`, values);
      }
    } else {
      // For website staff
      const cleanUpdates: any = {};
      if (updates.name !== undefined) cleanUpdates.name = updates.name;
      if (updates.email !== undefined) cleanUpdates.email = updates.email.trim().toLowerCase();
      if (updates.role !== undefined) cleanUpdates.role = updates.role.toLowerCase();
      if (activeVal !== undefined) cleanUpdates.is_active = activeVal;

      await WebsiteStaffModel.update(id, cleanUpdates);
    }
  }

  /**
   * Delete website staff (global admins are not allowed to be deleted for safety).
   */
  static async deleteAdmin(prefixedId: string) {
    if (prefixedId.startsWith('admin-')) {
      throw ApiError.forbidden('Global administrator accounts cannot be deleted');
    }

    const id = parseInt(prefixedId.replace('staff-', ''), 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid staff ID format');
    }

    const staff = await WebsiteStaffModel.findById(id);
    if (!staff) {
      throw ApiError.notFound('Website staff account not found');
    }

    await WebsiteStaffModel.delete(id);
  }
}
