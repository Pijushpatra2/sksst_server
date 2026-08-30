import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { AccountingModel } from './accounting.model';

export class AccountingController {
  static getSummary = async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query;
    const summary = await AccountingModel.getSummary(startDate as string, endDate as string);
    ApiResponse.ok(res, summary, 'Accounting summary generated successfully');
  };

  static getVouchers = async (req: Request, res: Response): Promise<void> => {
    const { limit } = req.query;
    const vouchers = await AccountingModel.listVouchers(Number(limit || 50));
    ApiResponse.ok(res, vouchers, 'Vouchers journal retrieved successfully');
  };
}
