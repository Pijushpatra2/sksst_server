import { ApiError } from '@utils/ApiError';
import { comparePassword } from '@utils/bcrypt';
import {
  signStaffAccessToken,
  signStaffRefreshToken,
  verifyStaffRefreshToken,
} from '@utils/jwt';
import { StaffModel } from '../staff/staff.model';
import { StaffJwtPayload } from '../../../types/canteen.types';

interface StaffLoginInput {
  email: string;
  password?: string;
}

interface StaffLoginResponse {
  accessToken: string;
  refreshToken: string;
  staff: {
    id: number;
    name: string;
    email: string;
    assignedRole: string;
  };
}

/**
 * Service managing Canteen Staff terminal authentication.
 */
export class CanteenAuthService {
  /**
   * Log in a POS terminal staff worker.
   */
  static async login(input: StaffLoginInput): Promise<StaffLoginResponse> {
    const staff = await StaffModel.findByEmail(input.email);

    if (!staff) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (!staff.is_active) {
      throw ApiError.forbidden('This terminal account has been deactivated');
    }

    // Verify password hash
    const isMatch = await comparePassword(input.password || '', staff.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Update last login asynchronously
    StaffModel.updateLastLogin(staff.id).catch((err) =>
      console.error(`Failed to update last login for staff ${staff.id}:`, err),
    );

    // Create JWT payloads
    const payload: StaffJwtPayload = {
      id: staff.id,
      email: staff.email,
      assignedRole: staff.assigned_role,
    };

    const accessToken  = signStaffAccessToken(payload);
    const refreshToken = signStaffRefreshToken({ id: staff.id });

    return {
      accessToken,
      refreshToken,
      staff: {
        id:           staff.id,
        name:         staff.name,
        email:        staff.email,
        assignedRole: staff.assigned_role,
      },
    };
  }

  /**
   * Exchange staff refresh token for new access token.
   */
  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = verifyStaffRefreshToken(token);
      const staff = await StaffModel.findById(decoded.id);

      if (!staff) {
        throw ApiError.unauthorized('Invalid session staff user');
      }

      if (!staff.is_active) {
        throw ApiError.forbidden('Your account is deactivated');
      }

      const payload: StaffJwtPayload = {
        id:           staff.id,
        email:        staff.email,
        assignedRole: staff.assigned_role,
      };

      const accessToken = signStaffAccessToken(payload);
      const refreshToken = signStaffRefreshToken({ id: staff.id });

      return { accessToken, refreshToken };
    } catch (err) {
      throw ApiError.unauthorized('Refresh token is expired or invalid');
    }
  }

  /**
   * Fetch current staff profile.
   */
  static async getProfile(id: number) {
    const staff = await StaffModel.findById(id);
    if (!staff) {
      throw ApiError.notFound('Staff profile not found');
    }

    return {
      id:           staff.id,
      name:         staff.name,
      email:        staff.email,
      assignedRole: staff.assigned_role,
      lastLoginAt:  staff.last_login_at,
      createdAt:    staff.created_at,
    };
  }
}
