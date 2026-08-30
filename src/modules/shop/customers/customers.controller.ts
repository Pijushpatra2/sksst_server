import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
import { ShopCustomersModel } from './customers.model';

export class ShopCustomersController {
  static list = async (req: Request, res: Response): Promise<void> => {
    const { search } = req.query;
    const customers = await ShopCustomersModel.listAll(search as string);
    ApiResponse.ok(res, customers, 'Customers retrieved successfully');
  };

  static getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const customer = await ShopCustomersModel.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');
    ApiResponse.ok(res, customer, 'Customer details retrieved');
  };
}
