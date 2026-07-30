import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import { AdminJwtPayload, StaffJwtPayload } from '../types/canteen.types';

/**
 * JWT utilities for Admin and Staff authentication.
 */

// ─── Admin JWTs ─────────────────────────────────────────────────────────────

export function signAdminAccessToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  });
}

export function signAdminRefreshToken(payload: { id: number; isStaff?: boolean }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any,
  });
}

export function verifyAdminAccessToken(token: string): AdminJwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AdminJwtPayload;
}

export function verifyAdminRefreshToken(token: string): { id: number; isStaff?: boolean } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: number; isStaff?: boolean };
}

// ─── Staff JWTs ─────────────────────────────────────────────────────────────

export function signStaffAccessToken(payload: StaffJwtPayload): string {
  return jwt.sign(payload, env.JWT_STAFF_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any, // reuse 15m default
  });
}

export function signStaffRefreshToken(payload: { id: number }): string {
  return jwt.sign(payload, env.JWT_STAFF_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as any, // reuse 7d default
  });
}

export function verifyStaffAccessToken(token: string): StaffJwtPayload {
  return jwt.verify(token, env.JWT_STAFF_ACCESS_SECRET) as StaffJwtPayload;
}

export function verifyStaffRefreshToken(token: string): { id: number } {
  return jwt.verify(token, env.JWT_STAFF_REFRESH_SECRET) as { id: number };
}
