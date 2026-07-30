import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { CustomerService } from './customers.service';

/**
 * Controller handling REST endpoints for devotee customer CRM profiles.
 */
export class CustomerController {
  /**
   * GET /api/canteen/customers
   */
  static list = async (req: Request, res: Response): Promise<void> => {
    // req.query is validated and coerced by listCustomerQuerySchema
    const { search, customerType, page, limit } = req.query as any;

    const filters = {
      search,
      customer_type: customerType,
      page,
      limit,
    };

    const result = await CustomerService.searchCustomers(filters);
    ApiResponse.ok(res, result.data, 'Customers retrieved successfully', result.meta);
  };

  /**
   * GET /api/canteen/customers/:id
   */
  static details = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const details = await CustomerService.getById(id);
    ApiResponse.ok(res, details, 'Customer profile retrieved successfully');
  };

  /**
   * POST /api/canteen/customers
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    const customerId = await CustomerService.createCustomer(req.body);
    ApiResponse.created(res, { id: customerId }, 'Customer registered successfully');
  };

  /**
   * PATCH /api/canteen/customers/:id
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await CustomerService.updateCustomer(id, req.body);
    ApiResponse.ok(res, null, 'Customer profile updated successfully');
  };

  /**
   * DELETE /api/canteen/customers/:id
   */
  static delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    await CustomerService.deleteCustomer(id);
    ApiResponse.ok(res, null, 'Customer profile deleted successfully');
  };
}
