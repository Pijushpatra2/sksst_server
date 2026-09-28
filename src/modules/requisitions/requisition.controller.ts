import { Request, Response } from 'express';
import { RequisitionService } from './requisition.service';
import { uploadToS3 } from '@utils/s3';

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
   * PUT /api/requisitions/:id
   * Admin updates storekeeper details, quantities, and prices
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const requisition = await RequisitionService.adminUpdate(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Requisition updated successfully',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to update requisition',
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

  /**
   * POST/PUT /api/requisitions/:id/receipt
   * Upload or edit receipt for a requisition (accepts multipart file or JSON with base64/url)
   */
  static async uploadReceipt(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      let receiptUrl = '';
      let receiptFilename = req.body?.receipt_filename || req.body?.filename || '';
      const uploadedBy = req.body?.receipt_uploaded_by || req.body?.uploaded_by || 'Staff';
      const notes = req.body?.receipt_notes || req.body?.notes || null;

      // Check if file was uploaded via multipart/form-data
      const file = (req as any).file || ((req as any).files && (req as any).files[0]);
      if (file) {
        receiptFilename = file.originalname;
        receiptUrl = await uploadToS3(file.buffer, file.originalname, 'requisition-receipts');
      } else if (req.body && req.body.image) {
        receiptUrl = await uploadToS3(req.body.image, receiptFilename || 'receipt.jpg', 'requisition-receipts');
      } else if (req.body && req.body.file) {
        receiptUrl = await uploadToS3(req.body.file, receiptFilename || 'receipt.pdf', 'requisition-receipts');
      } else if (req.body && req.body.receipt_url) {
        receiptUrl = req.body.receipt_url;
      } else {
        res.status(400).json({
          success: false,
          message: 'No receipt file or receipt URL provided',
        });
        return;
      }

      const requisition = await RequisitionService.updateReceipt(id, {
        receipt_url: receiptUrl,
        receipt_filename: receiptFilename || null,
        receipt_uploaded_by: uploadedBy,
        receipt_notes: notes,
      });

      res.status(200).json({
        success: true,
        message: 'Requisition receipt uploaded successfully',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to upload receipt',
      });
    }
  }

  /**
   * DELETE /api/requisitions/:id/receipt
   * Remove / clear receipt from requisition
   */
  static async deleteReceipt(req: Request, res: Response): Promise<void> {
    try {
      const requisition = await RequisitionService.deleteReceipt(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Requisition receipt removed successfully',
        data: { requisition },
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to delete receipt',
      });
    }
  }
}
