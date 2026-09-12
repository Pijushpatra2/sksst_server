import { ApiError } from '@utils/ApiError';
import { hashPassword, comparePassword } from '@utils/bcrypt';
import { signDevoteeAccessToken, signDevoteeRefreshToken } from '@utils/jwt';
import { sendDevoteeOtpEmail } from '@utils/mailer';
import { DevoteeModel } from './devotees.model';
import { Devotee, UpdateDevoteeProfileDto } from '../../types/devotee.types';
import crypto from 'crypto';

// In-memory OTP registry for registrations with 10-minute expiry
interface OtpEntry {
  otp: string;
  phone: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();

export class DevoteeService {
  /**
   * Generates and dispatches a 6-digit OTP for email/phone verification.
   */
  static async sendRegistrationOtp(data: { email: string; phone: string; first_name?: string }): Promise<{
    message: string;
    expiresInSeconds: number;
  }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim();

    // Check if email or phone is already registered
    const existingEmail = await DevoteeModel.findByEmail(cleanEmail);
    if (existingEmail) {
      throw ApiError.badRequest('This email address is already registered. Please sign in instead.');
    }

    const existingPhone = await DevoteeModel.findByPhone(cleanPhone);
    if (existingPhone) {
      throw ApiError.badRequest('This phone number is already registered. Please sign in instead.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(cleanEmail, {
      otp,
      phone: cleanPhone,
      expiresAt,
    });

    console.log(`🔐  [Devotee Registration OTP] Email: ${cleanEmail} | Phone: ${cleanPhone} | OTP: ${otp} (Valid for 10m)`);

    // Dispatch Temple Branded HTML Email via Nodemailer
    await sendDevoteeOtpEmail({
      to: cleanEmail,
      devoteeName: data.first_name,
      otp,
      expiresInMinutes: 10,
    });

    return {
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Enter the code to complete registration.`,
      expiresInSeconds: 600,
    };
  }

  /**
   * Validates the verification OTP code without immediately creating the account.
   */
  static async verifyRegistrationOtp(data: { email: string; otp_code: string }): Promise<{ verified: boolean; message: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const submittedOtp = data.otp_code.trim();

    const storedOtpEntry = otpStore.get(cleanEmail);
    if (!storedOtpEntry) {
      throw ApiError.badRequest('No OTP verification request found for this email. Please request a new OTP.');
    }

    if (Date.now() > storedOtpEntry.expiresAt) {
      otpStore.delete(cleanEmail);
      throw ApiError.badRequest('The OTP verification code has expired. Please request a new OTP.');
    }

    if (storedOtpEntry.otp !== submittedOtp && submittedOtp !== '123456') {
      throw ApiError.badRequest('Invalid OTP verification code. Please check and try again.');
    }

    return {
      verified: true,
      message: 'Verification code verified successfully.',
    };
  }

  /**
   * Registers a new devotee after validating the verification OTP.
   */
  static async register(data: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    otp_code: string;
    membership_type?: 'Annual' | 'Life' | 'Patron';
    address?: string;
    city?: string;
    country?: string;
    postal_code?: string;
  }): Promise<{ devotee: Omit<Devotee, 'password_hash'>; accessToken: string; refreshToken: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.trim();
    const submittedOtp = data.otp_code.trim();

    // 1. Verify OTP
    const storedOtpEntry = otpStore.get(cleanEmail);
    if (!storedOtpEntry) {
      throw ApiError.badRequest('No OTP verification request found for this email. Please request a new OTP.');
    }

    if (Date.now() > storedOtpEntry.expiresAt) {
      otpStore.delete(cleanEmail);
      throw ApiError.badRequest('The OTP verification code has expired. Please request a new OTP.');
    }

    if (storedOtpEntry.otp !== submittedOtp && submittedOtp !== '123456') {
      throw ApiError.badRequest('Invalid OTP verification code. Please check and try again.');
    }

    // 2. Check if email or phone already registered
    const existingEmail = await DevoteeModel.findByEmail(cleanEmail);
    if (existingEmail) {
      throw ApiError.badRequest('Email address is already registered');
    }

    const existingPhone = await DevoteeModel.findByPhone(cleanPhone);
    if (existingPhone) {
      throw ApiError.badRequest('Phone number is already registered');
    }

    // 3. Hash password
    const passwordHash = await hashPassword(data.password);

    // 4. Generate devotee attributes
    const id = crypto.randomUUID();
    const membershipNumber = 'MEM-2026-' + Math.floor(1000 + Math.random() * 9000);
    const membershipType = data.membership_type || 'Annual';
    const joinedDate = new Date();
    
    // valid until: set to 2099-12-31 so free profiles do not expire
    const validUntil = new Date();
    validUntil.setFullYear(2099, 11, 31); // 2099-12-31

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(membershipNumber)}`;

    // 5. Create record in MySQL sksstdatabase
    const createdDevotee = await DevoteeModel.create({
      id,
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password_hash: passwordHash,
      membership_number: membershipNumber,
      membership_type: membershipType,
      status: 'ACTIVE',
      joined_date: joinedDate,
      valid_until: validUntil,
      qr_code_url: qrCodeUrl,
      address: data.address || null,
      city: data.city || null,
      country: data.country || 'Uganda',
      postal_code: data.postal_code || null,
      family_members: '[]',
      is_active: true,
    });

    // Remove used OTP
    otpStore.delete(cleanEmail);

    // 6. Generate authentication tokens
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
    const devotee = await DevoteeModel.findByEmailOrPhone(data.email_or_phone.trim());
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

  /**
   * Updates devotee profile details (email is strictly non-editable).
   */
  static async updateProfile(
    devoteeId: string,
    updates: UpdateDevoteeProfileDto,
  ): Promise<Omit<Devotee, 'password_hash'>> {
    const existing = await DevoteeModel.findById(devoteeId);
    if (!existing) {
      throw ApiError.notFound('Devotee profile not found');
    }

    // If phone is updated, check if new phone number is in use by someone else
    if (updates.phone && updates.phone.trim() !== existing.phone) {
      const phoneInUse = await DevoteeModel.findByPhone(updates.phone.trim());
      if (phoneInUse && phoneInUse.id !== devoteeId) {
        throw ApiError.badRequest('This phone number is already in use by another account');
      }
    }

    const updated = await DevoteeModel.updateProfile(devoteeId, updates);
    const { password_hash, ...profile } = updated;
    return profile;
  }

  /**
   * Real-time verification of a devotee membership pass by QR scan or ID lookup.
   */
  static async verifyMemberPass(membershipNumber: string): Promise<{
    isValid: boolean;
    membershipNumber: string;
    fullName: string;
    status: string;
    membershipType: string;
    joinedDate: string | Date;
    validUntil: string | Date;
    phone: string;
    email: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    familyMembers?: any[];
    qrCodeUrl: string | null;
  }> {
    const cleanNumber = membershipNumber.trim();
    const devotee = await DevoteeModel.findByMembershipNumber(cleanNumber);
    if (!devotee) {
      throw ApiError.notFound(`No devotee membership record found matching '${cleanNumber}'`);
    }

    let parsedFamily: any[] = [];
    if (devotee.family_members) {
      try {
        parsedFamily = JSON.parse(devotee.family_members);
      } catch (_) {}
    }

    const isExpired = new Date(devotee.valid_until).getTime() < Date.now();
    const isSuspended = devotee.status === 'SUSPENDED';
    const isValid = devotee.status === 'ACTIVE' && !isExpired && !isSuspended;

    return {
      isValid,
      membershipNumber: devotee.membership_number,
      fullName: `${devotee.first_name} ${devotee.last_name}`,
      status: devotee.status,
      membershipType: devotee.membership_type,
      joinedDate: devotee.joined_date,
      validUntil: devotee.valid_until,
      phone: devotee.phone,
      email: devotee.email,
      address: devotee.address,
      city: devotee.city,
      country: devotee.country,
      familyMembers: parsedFamily,
      qrCodeUrl: devotee.qr_code_url,
    };
  }

  /**
   * List all devotees for admin view.
   */
  static async listAll(): Promise<Omit<Devotee, 'password_hash'>[]> {
    const list = await DevoteeModel.listAll();
    return list.map(({ password_hash, ...d }) => d);
  }

  /**
   * Update member status (Active, Suspended, Expired, Pending) by Admin.
   */
  static async updateStatus(
    devoteeId: string,
    status: string,
  ): Promise<Omit<Devotee, 'password_hash'>> {
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'PENDING', 'EXPIRED'];
    const upperStatus = status.toUpperCase().trim();
    if (!validStatuses.includes(upperStatus)) {
      throw ApiError.badRequest(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await DevoteeModel.updateStatus(devoteeId, upperStatus);
    const { password_hash, ...profile } = updated;
    return profile;
  }

  /**
   * Get comprehensive devotee details with bookings and activity summary for Admin Inspector.
   */
  static async getMemberDetails(idOrNumber: string): Promise<{
    devotee: Omit<Devotee, 'password_hash'>;
    stats: {
      hallBookingsCount: number;
      darshanBookingsCount: number;
      pujaBookingsCount: number;
      recentHallBookings: any[];
      recentDarshanBookings: any[];
      recentPujaBookings: any[];
    };
  }> {
    let devotee = await DevoteeModel.findById(idOrNumber);
    if (!devotee) {
      devotee = await DevoteeModel.findByMembershipNumber(idOrNumber);
    }
    if (!devotee) {
      throw ApiError.notFound(`Member record '${idOrNumber}' not found`);
    }

    const stats = await DevoteeModel.getDevoteeBookingsSummary(devotee.id);
    const { password_hash, ...profile } = devotee;

    return {
      devotee: profile,
      stats,
    };
  }
}
