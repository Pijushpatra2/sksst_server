import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { StaffService } from './staff.service';

/**
 * Controller handling staff profile edits (admin restricted).
 */
export class StaffController {
  /**
   * GET /api/canteen/staff
   */
  static list = async (_req: Request, res: Response): Promise<void> => {
    const list = await StaffService.getAllStaff();
    ApiResponse.ok(res, list, 'Staff accounts retrieved successfully');
  };

  /**
   * POST /api/canteen/staff
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    // req.admin is set by verifyAdminJWT middleware
    const adminId = req.admin!.id;
    const staffId = await StaffService.createStaff(req.body, adminId);
    ApiResponse.created(res, { id: staffId }, 'Staff account created successfully');
  };

  /**
   * PATCH /api/canteen/staff/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await StaffService.updateStaff(id, req.body);
    ApiResponse.ok(res, null, 'Staff account updated successfully');
  };

  /**
   * DELETE /api/canteen/staff/:id
   */
  static delete = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    await StaffService.deactivateStaff(id);
    ApiResponse.ok(res, null, 'Staff account deactivated successfully');
  };
}
