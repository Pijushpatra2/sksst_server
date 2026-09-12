import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { ShopOrdersModel } from './orders.model';

export class ShopOrdersController {
  static list = async (req: Request, res: Response): Promise<void> => {
    const { status, search } = req.query;
    const orders = await ShopOrdersModel.listAll({
      status: status as string,
      search: search as string,
    });
    ApiResponse.ok(res, orders, 'Orders retrieved successfully');
  };

  static getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const order = await ShopOrdersModel.findById(id);
    if (!order) throw ApiError.notFound('Order not found');
    ApiResponse.ok(res, order, 'Order details retrieved');
  };

  static create = async (req: Request, res: Response): Promise<void> => {
    const {
      customerName,
      customerEmail,
      customerPhone,
      devoteeId,
      shippingAddress,
      subtotal,
      discount,
      tax,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus,
      couponCode,
      items,
    } = req.body;

    if (!customerName || !customerEmail || !customerPhone || !shippingAddress || !items || !Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest('Required order fields are missing');
    }

    const created = await ShopOrdersModel.create({
      customerName,
      customerEmail,
      customerPhone,
      devoteeId,
      shippingAddress,
      subtotal: Number(subtotal || 0),
      discount: Number(discount || 0),
      tax: Number(tax || 0),
      shippingFee: Number(shippingFee || 0),
      total: Number(total || 0),
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentStatus || 'PAID',
      couponCode,
      items,
    });

    ApiResponse.created(res, created, 'Order placed successfully');
  };

  static updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status) throw ApiError.badRequest('Order status is required');

    const updated = await ShopOrdersModel.updateStatus(id, status, trackingNumber);
    if (!updated) throw ApiError.notFound('Order not found');

    ApiResponse.ok(res, updated, 'Order status updated successfully');
  };

  static getMyOrders = async (req: Request, res: Response): Promise<void> => {
    const devoteeId = (req as any).devotee?.id || (req.query.devoteeId as string);
    const email = (req as any).devotee?.email || (req.query.email as string);
    const phone = (req as any).devotee?.phone || (req.query.phone as string);

    const orders = await ShopOrdersModel.listByDevotee({ devoteeId, email, phone });
    ApiResponse.ok(res, orders, 'Devotee orders retrieved successfully');
  };
}
