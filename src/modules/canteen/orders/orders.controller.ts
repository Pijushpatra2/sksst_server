import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { OrderService } from './orders.service';

/**
 * Controller handling REST endpoints for canteen orders and KDS displays.
 */
export class OrderController {
  /**
   * GET /api/canteen/orders
   */
  static list = async (req: Request, res: Response): Promise<void> => {
    // req.query has been coerced by orderQuerySchema
    const { status, tableId, date } = req.query as any;

    const filters = {
      status,
      table_id: tableId,
      date,
    };

    const list = await OrderService.listOrders(filters);
    ApiResponse.ok(res, list, 'Orders retrieved successfully');
  };

  /**
   * GET /api/canteen/orders/:id
   */
  static details = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const details = await OrderService.getOrderDetails(id);
    ApiResponse.ok(res, details, 'Order details retrieved successfully');
  };

  /**
   * POST /api/canteen/orders
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    // req.staff is populated by verifyStaffJWT, req.admin is populated if placed by admin
    const staffId = req.staff ? req.staff.id : null;
    const orderId = await OrderService.createOrder(req.body, staffId);
    ApiResponse.created(res, { id: orderId }, 'Order created successfully');
  };

  /**
   * PATCH /api/canteen/orders/:id/status
   */
  static updateStatus = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const { status } = req.body;
    await OrderService.updateStatus(id, status);
    ApiResponse.ok(res, null, 'Order status updated successfully');
  };

  /**
   * PATCH /api/canteen/orders/:id/payment
   */
  static recordPayment = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await OrderService.recordPayment(id, req.body);
    ApiResponse.ok(res, null, 'Payment details recorded successfully');
  };

  /**
   * DELETE /api/canteen/orders/:id
   */
  static delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await OrderService.cancelOrder(id);
    ApiResponse.ok(res, null, 'Order cancelled successfully');
  };

  /**
   * GET /api/canteen/orders/kitchen/queue
   */
  static kitchenQueue = async (_req: Request, res: Response): Promise<void> => {
    const queue = await OrderService.getKitchenQueue();
    ApiResponse.ok(res, queue, 'Kitchen queue retrieved successfully');
  };
}
