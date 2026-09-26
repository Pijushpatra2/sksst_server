import { ApiError } from '@utils/ApiError';
import { hashPassword, comparePassword } from '@utils/bcrypt';
import { signShopkeeperAccessToken, signShopkeeperRefreshToken } from '@utils/jwt';
import { ShopkeeperModel } from './shopkeeper.model';
import {
  Shopkeeper,
  CreateShopkeeperDto,
  UpdateShopkeeperDto,
  ShopkeeperStats
} from '../../types/shop.types';
import crypto from 'crypto';

export class ShopkeeperService {
  /**
   * Shopkeeper login handler.
   */
  static async login(data: { email: string; password: string }): Promise<{
    shopkeeper: Omit<Shopkeeper, 'password_hash'>;
    accessToken: string;
    refreshToken: string;
  }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const shopkeeper = await ShopkeeperModel.findByEmail(cleanEmail);

    if (!shopkeeper) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!shopkeeper.is_active || shopkeeper.status === 'SUSPENDED') {
      throw ApiError.forbidden('Your shopkeeper account is suspended or inactive. Please contact the administrator.');
    }

    const isMatch = await comparePassword(data.password, shopkeeper.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login timestamp
    await ShopkeeperModel.update(shopkeeper.id, { last_login: new Date() });

    // Generate JWT tokens
    const accessToken = signShopkeeperAccessToken({
      id: shopkeeper.id,
      name: shopkeeper.name,
      email: shopkeeper.email,
      role: shopkeeper.role || 'SHOPKEEPER',
      storeName: shopkeeper.store_name,
    });

    const refreshToken = signShopkeeperRefreshToken({ id: shopkeeper.id });

    const { password_hash, ...profile } = shopkeeper;

    return {
      shopkeeper: {
        ...profile,
        last_login: new Date(),
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get shopkeeper profile by ID.
   */
  static async getProfile(id: string): Promise<Omit<Shopkeeper, 'password_hash'>> {
    const shopkeeper = await ShopkeeperModel.findById(id);
    if (!shopkeeper) {
      throw ApiError.notFound('Shopkeeper account not found');
    }

    const { password_hash, ...profile } = shopkeeper;
    return profile;
  }

  /**
   * Shopkeeper changes their OWN password (requires old password verification).
   */
  static async changePassword(
    shopkeeperId: string,
    data: { currentPassword: string; newPassword: string }
  ): Promise<{ message: string }> {
    const shopkeeper = await ShopkeeperModel.findById(shopkeeperId);
    if (!shopkeeper) {
      throw ApiError.notFound('Shopkeeper account not found');
    }

    if (!data.currentPassword || !data.newPassword) {
      throw ApiError.badRequest('Both current password and new password are required');
    }

    if (data.newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters long');
    }

    const isMatch = await comparePassword(data.currentPassword, shopkeeper.password_hash);
    if (!isMatch) {
      throw ApiError.badRequest('Incorrect current password');
    }

    const newHash = await hashPassword(data.newPassword);
    await ShopkeeperModel.update(shopkeeperId, { password_hash: newHash });

    return { message: 'Password updated successfully' };
  }

  /**
   * Shopkeeper updates their own profile details.
   */
  static async updateOwnProfile(
    shopkeeperId: string,
    data: { name?: string; phone?: string; address?: string; avatar_url?: string }
  ): Promise<Omit<Shopkeeper, 'password_hash'>> {
    const shopkeeper = await ShopkeeperModel.findById(shopkeeperId);
    if (!shopkeeper) {
      throw ApiError.notFound('Shopkeeper account not found');
    }

    if (data.phone && data.phone.trim() !== shopkeeper.phone) {
      const existingPhone = await ShopkeeperModel.findByPhone(data.phone.trim());
      if (existingPhone && existingPhone.id !== shopkeeperId) {
        throw ApiError.conflict('This phone number is already registered to another shopkeeper');
      }
    }

    await ShopkeeperModel.update(shopkeeperId, {
      name: data.name?.trim(),
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      avatar_url: data.avatar_url?.trim(),
    });

    return this.getProfile(shopkeeperId);
  }

  // =========================================================================
  //   ADMIN MANAGEMENT CAPABILITIES
  // =========================================================================

  /**
   * Admin lists all shopkeeper accounts.
   */
  static async listAllForAdmin(): Promise<Omit<Shopkeeper, 'password_hash'>[]> {
    return ShopkeeperModel.listAll();
  }

  /**
   * Admin creates a new shopkeeper account.
   */
  static async adminCreateShopkeeper(
    data: CreateShopkeeperDto,
    adminId?: number
  ): Promise<Omit<Shopkeeper, 'password_hash'>> {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await ShopkeeperModel.findByEmail(cleanEmail);
    if (existing) {
      throw ApiError.conflict('A shopkeeper with this email already exists');
    }

    if (data.phone) {
      const existingPhone = await ShopkeeperModel.findByPhone(data.phone.trim());
      if (existingPhone) {
        throw ApiError.conflict('A shopkeeper with this phone number already exists');
      }
    }

    if (!data.password || data.password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters');
    }

    const passwordHash = await hashPassword(data.password);
    const id = crypto.randomUUID();

    const created = await ShopkeeperModel.create({
      id,
      name: data.name,
      email: cleanEmail,
      phone: data.phone,
      password_hash: passwordHash,
      role: 'SHOPKEEPER',
      store_name: data.store_name || 'Main Temple Gift & Book Store',
      status: data.status || 'ACTIVE',
      is_active: data.status !== 'SUSPENDED' && data.status !== 'INACTIVE',
      address: data.address,
      created_by: adminId,
    });

    const { password_hash, ...profile } = created;
    return profile;
  }

  /**
   * Admin updates an existing shopkeeper's profile and status.
   */
  static async adminUpdateShopkeeper(
    id: string,
    data: UpdateShopkeeperDto
  ): Promise<Omit<Shopkeeper, 'password_hash'>> {
    const shopkeeper = await ShopkeeperModel.findById(id);
    if (!shopkeeper) {
      throw ApiError.notFound('Shopkeeper account not found');
    }

    if (data.phone && data.phone.trim() !== shopkeeper.phone) {
      const existingPhone = await ShopkeeperModel.findByPhone(data.phone.trim());
      if (existingPhone && existingPhone.id !== id) {
        throw ApiError.conflict('This phone number is already in use by another shopkeeper');
      }
    }

    const updatePayload: Partial<Shopkeeper> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
    if (data.store_name !== undefined) updatePayload.store_name = data.store_name.trim();
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      updatePayload.is_active = data.status === 'ACTIVE' ? 1 : 0;
    }
    if (data.is_active !== undefined) {
      updatePayload.is_active = data.is_active ? 1 : 0;
    }
    if (data.address !== undefined) updatePayload.address = data.address.trim();

    await ShopkeeperModel.update(id, updatePayload);
    return this.getProfile(id);
  }

  /**
   * Admin directly resets/updates a shopkeeper's password WITHOUT needing the old password.
   */
  static async adminResetPassword(
    id: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const shopkeeper = await ShopkeeperModel.findById(id);
    if (!shopkeeper) {
      throw ApiError.notFound('Shopkeeper account not found');
    }

    if (!newPassword || newPassword.trim().length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters long');
    }

    const newHash = await hashPassword(newPassword.trim());
    await ShopkeeperModel.update(id, { password_hash: newHash });

    return { message: `Password for '${shopkeeper.name}' (${shopkeeper.email}) has been successfully updated by Admin` };
  }

  /**
   * Admin deletes a shopkeeper account.
   */
  static async adminDeleteShopkeeper(id: string): Promise<{ message: string }> {
    const shopkeeper = await ShopkeeperModel.findById(id);
    if (!shopkeeper) {
      throw ApiError.notFound('Shopkeeper account not found');
    }

    await ShopkeeperModel.delete(id);
    return { message: `Shopkeeper '${shopkeeper.name}' deleted successfully` };
  }

  /**
   * Shopkeeper & Admin Dashboard store statistics.
   */
  static async getDashboardStats(): Promise<ShopkeeperStats> {
    return ShopkeeperModel.getShopkeeperStats();
  }
}
