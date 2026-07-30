import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { CanteenAuthService } from './canteenAuth.service';

/**
 * Controller handling POS terminal worker authentication.
 */
export class CanteenAuthController {
  /**
   * POST /api/canteen/auth/login
   */
  static login = async (req: Request, res: Response): Promise<void> => {
    const result = await CanteenAuthService.login(req.body);
    ApiResponse.ok(res, result, 'Terminal login successful');
  };

  /**
   * POST /api/canteen/auth/refresh
   */
  static refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const result = await CanteenAuthService.refresh(refreshToken);
    ApiResponse.ok(res, result, 'Token refreshed successfully');
  };

  /**
   * POST /api/canteen/auth/logout
   */
  static logout = async (_req: Request, res: Response): Promise<void> => {
    ApiResponse.ok(res, null, 'Logged out successfully');
  };

  /**
   * GET /api/canteen/auth/me
   */
  static me = async (req: Request, res: Response): Promise<void> => {
    const staffId = req.staff!.id;
    const result = await CanteenAuthService.getProfile(staffId);
    ApiResponse.ok(res, result, 'Staff profile retrieved successfully');
  };
}
