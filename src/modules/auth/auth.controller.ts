import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { AuthService } from './auth.service';

/**
 * Controller layer for global admin authentication routes.
 */
export class AuthController {
  /**
   * POST /api/auth/admin/login
   */
  static login = async (req: Request, res: Response): Promise<void> => {
    const result = await AuthService.login(req.body);
    ApiResponse.ok(res, result, 'Login successful');
  };

  /**
   * POST /api/auth/admin/refresh
   */
  static refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    ApiResponse.ok(res, result, 'Token refreshed successfully');
  };

  /**
   * POST /api/auth/admin/logout
   * Since JWTs are stateless, we simply tell the client to clear their tokens.
   * If token blacklisting is needed in the future, it can be implemented here.
   */
  static logout = async (_req: Request, res: Response): Promise<void> => {
    ApiResponse.ok(res, null, 'Logged out successfully');
  };

  /**
   * GET /api/auth/admin/me
   */
  static me = async (req: Request, res: Response): Promise<void> => {
    // req.admin is guaranteed to be set by the verifyAdminJWT guard
    const adminId = req.admin!.id;
    const result = await AuthService.getProfile(adminId);
    ApiResponse.ok(res, result, 'Profile retrieved successfully');
  };

  /**
   * PATCH /api/auth/password
   */
  static changePassword = async (req: Request, res: Response): Promise<void> => {
    const adminId = req.admin!.id;
    await AuthService.changePassword(adminId, req.body);
    ApiResponse.ok(res, null, 'Password updated successfully');
  };

  /**
   * GET /api/auth/admins
   */
  static listAdmins = async (_req: Request, res: Response): Promise<void> => {
    const list = await AuthService.listAdmins();
    ApiResponse.ok(res, list, 'Administrators retrieved successfully');
  };

  /**
   * POST /api/auth/admins
   */
  static createAdmin = async (req: Request, res: Response): Promise<void> => {
    const newAdmin = await AuthService.createAdmin(req.body);
    ApiResponse.ok(res, newAdmin, 'Administrator created successfully');
  };

  /**
   * PATCH /api/auth/admins/:id
   */
  static updateAdmin = async (req: Request, res: Response): Promise<void> => {
    await AuthService.updateAdmin(req.params.id, req.body);
    ApiResponse.ok(res, null, 'Administrator updated successfully');
  };

  /**
   * DELETE /api/auth/admins/:id
   */
  static deleteAdmin = async (req: Request, res: Response): Promise<void> => {
    await AuthService.deleteAdmin(req.params.id);
    ApiResponse.ok(res, null, 'Administrator deleted successfully');
  };
}
