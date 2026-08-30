import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { ShopCouponsModel } from './coupons.model';

export class ShopCouponsController {
  static list = async (_req: Request, res: Response): Promise<void> => {
    const coupons = await ShopCouponsModel.listAll();
    ApiResponse.ok(res, coupons, 'Coupons retrieved successfully');
  };

  static create = async (req: Request, res: Response): Promise<void> => {
    const { code, discountType, value, minSpend, description } = req.body;
    if (!code || !discountType || value === undefined) {
      throw ApiError.badRequest('Code, discountType and value are required');
    }

    const existing = await ShopCouponsModel.findByCode(code);
    if (existing) {
      throw ApiError.badRequest(`Coupon with code ${code.toUpperCase()} already exists`);
    }

    const created = await ShopCouponsModel.create({
      code,
      discountType,
      value: Number(value),
      minSpend: Number(minSpend || 0),
      description,
    });
    ApiResponse.created(res, created, 'Coupon created successfully');
  };

  static toggle = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const toggled = await ShopCouponsModel.toggle(id);
    if (!toggled) throw ApiError.notFound('Coupon not found');
    ApiResponse.ok(res, toggled, `Coupon is now ${toggled.active ? 'Active' : 'Inactive'}`);
  };

  static delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await ShopCouponsModel.delete(id);
    ApiResponse.ok(res, null, 'Coupon deleted successfully');
  };

  static validate = async (req: Request, res: Response): Promise<void> => {
    const { code, subtotal } = req.body;
    if (!code) throw ApiError.badRequest('Coupon code is required');

    const coupon = await ShopCouponsModel.findByCode(code);
    if (!coupon || !coupon.active) {
      throw ApiError.badRequest('Invalid or inactive coupon code');
    }

    const amount = Number(subtotal || 0);
    if (amount < coupon.minSpend) {
      throw ApiError.badRequest(`Minimum spend of UGX ${coupon.minSpend} required for this coupon`);
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENT') {
      discount = Math.round((amount * coupon.value) / 100);
    } else {
      discount = Math.min(amount, coupon.value);
    }

    ApiResponse.ok(
      res,
      {
        coupon,
        discount,
        newTotal: Math.max(0, amount - discount),
      },
      'Coupon applied successfully',
    );
  };
}
