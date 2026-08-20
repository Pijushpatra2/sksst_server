import { ApiError } from '@utils/ApiError';
import { hashPassword, comparePassword } from '@utils/bcrypt';
import { signDevoteeAccessToken, signDevoteeRefreshToken } from '@utils/jwt';
import { DevoteeModel } from './devotees.model';
import { Devotee } from '../../types/devotee.types';
import crypto from 'crypto';

export class DevoteeService {
  /**
   * Registers a new devotee on the website storefront.
   */
  static async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    membership_type?: 'Annual' | 'Life' | 'Patron';
  }): Promise<{ devotee: Omit<Devotee, 'password_hash'>; accessToken: string; refreshToken: string }> {
    // 1. Check if email or phone already registered
    const existingEmail = await DevoteeModel.findByEmail(data.email);
    if (existingEmail) {
      throw ApiError.badRequest('Email address is already registered');
    }

    const existingPhone = await DevoteeModel.findByPhone(data.phone);
    if (existingPhone) {
      throw ApiError.badRequest('Phone number is already registered');
    }

    // 2. Hash password
    const passwordHash = await hashPassword(data.password);

    // 3. Generate devotee attributes
    const id = crypto.randomUUID();
    const membershipNumber = 'MEM-2026-' + Math.floor(1000 + Math.random() * 9000);
    const membershipType = data.membership_type || 'Annual';
    const joinedDate = new Date();
    
    // valid until: set to 2099-12-31 so free profiles do not expire
    const validUntil = new Date();
    validUntil.setFullYear(2099, 11, 31); // 2099-12-31 (month 11 is December)

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${membershipNumber}`;

    // 4. Create record
    const createdDevotee = await DevoteeModel.create({
      id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      password_hash: passwordHash,
      membership_number: membershipNumber,
      membership_type: membershipType,
      status: 'ACTIVE',
      joined_date: joinedDate,
      valid_until: validUntil,
      qr_code_url: qrCodeUrl,
      is_active: true,
    });

    // 5. Generate authentication tokens
    const accessToken = signDevoteeAccessToken({
      id: createdDevotee.id,
      firstName: createdDevotee.first_name,
      lastName: createdDevotee.last_name,
      email: createdDevotee.email,
      phone: createdDevotee.phone,
      membershipNumber: createdDevotee.membership_number,
      role: 'DEVOTEE',
    });

    const refreshToken = signDevoteeRefreshToken({ id: createdDevotee.id });

    // Remove password_hash from return payload
    const { password_hash, ...profile } = createdDevotee;

    return {
      devotee: profile,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logs in a devotee and returns access/refresh tokens.
   */
  static async login(data: {
    email_or_phone: string;
    password: string;
  }): Promise<{ devotee: Omit<Devotee, 'password_hash'>; accessToken: string; refreshToken: string }> {
    const devotee = await DevoteeModel.findByEmailOrPhone(data.email_or_phone);
    if (!devotee) {
      throw ApiError.unauthorized('Invalid email/phone or password');
    }

    if (!devotee.is_active || devotee.status === 'SUSPENDED') {
      throw ApiError.forbidden('Your devotee profile has been suspended or is inactive');
    }

    const isMatch = await comparePassword(data.password, devotee.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email/phone or password');
    }

    // Generate tokens
    const accessToken = signDevoteeAccessToken({
      id: devotee.id,
      firstName: devotee.first_name,
      lastName: devotee.last_name,
      email: devotee.email,
      phone: devotee.phone,
      membershipNumber: devotee.membership_number,
      role: 'DEVOTEE',
    });

    const refreshToken = signDevoteeRefreshToken({ id: devotee.id });

    const { password_hash, ...profile } = devotee;

    return {
      devotee: profile,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Retrieve profile by ID.
   */
  static async getProfile(id: string): Promise<Omit<Devotee, 'password_hash'>> {
    const devotee = await DevoteeModel.findById(id);
    if (!devotee) {
      throw ApiError.notFound('Devotee profile not found');
    }

    const { password_hash, ...profile } = devotee;
    return profile;
  }
}
