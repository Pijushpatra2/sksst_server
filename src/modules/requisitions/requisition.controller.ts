import { Request, Response } from 'express';
import { RequisitionService } from './requisition.service';

export class RequisitionController {
  /**
   * POST /api/requisitions
   * Create a new store requisition
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const requisition = await RequisitionService.createRequisition(req.body);
      res.status(201).json({
        success: true,
        message: 'Requisition submitted to Admin successfully',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to create requisition',
      });
    }
  }

  /**
   * GET /api/requisitions
   * List requisitions with filters
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string,
        department: req.query.department as string,
        target_shopkeeper_id: req.query.target_shopkeeper_id as string,
        requested_by_id: req.query.requested_by_id as string,
        search: req.query.search as string,
      };

      const requisitions = await RequisitionService.listRequisitions(filters);
      res.status(200).json({
        success: true,
        data: { requisitions },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch requisitions',
      });
    }
  }

  /**
   * GET /api/requisitions/stats
   * Summary KPI stats
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const shopkeeperId = req.query.target_shopkeeper_id as string;
      const stats = await RequisitionService.getStats(shopkeeperId);
      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch requisition stats',
      });
    }
  }

  /**
   * GET /api/requisitions/:id
   * Get single requisition by ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const requisition = await RequisitionService.getRequisitionById(req.params.id);
      res.status(200).json({
        success: true,
        data: { requisition },
      });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        message: err.message || 'Requisition not found',
      });
    }
  }

  /**
   * PUT /api/requisitions/:id/admin-approve
   * Admin approves requisition, adjusts quantities, and assigns Shopkeeper
   */
  static async adminApprove(req: Request, res: Response): Promise<void> {
    try {
      const requisition = await RequisitionService.adminApprove(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Requisition approved and dispatched to Shopkeeper desk',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to approve requisition',
      });
    }
  }

  /**
   * PUT /api/requisitions/:id/admin-reject
   * Admin rejects requisition
   */
  static async adminReject(req: Request, res: Response): Promise<void> {
    try {
      const { reason, adminName } = req.body;
      const requisition = await RequisitionService.adminReject(
        req.params.id,
        reason || 'Requisition rejected by Administrator',
        adminName || 'Super Admin'
      );
      res.status(200).json({
        success: true,
        message: 'Requisition rejected',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to reject requisition',
      });
    }
  }

  /**
   * PUT /api/requisitions/:id/shopkeeper-fulfill
   * Shopkeeper fulfills items, enters issued quantity, system auto-calculates remaining
   */
  static async shopkeeperFulfill(req: Request, res: Response): Promise<void> {
    try {
      const requisition = await RequisitionService.shopkeeperFulfill(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Store fulfillment saved and quantities updated across dashboards',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to fulfill requisition',
      });
    }
  }
}
