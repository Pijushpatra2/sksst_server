import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ReportsService } from './reports.service';

/**
 * Controller handling REST endpoints for canteen analytical reports.
 */
export class ReportsController {
  /**
   * GET /api/canteen/reports/today
   */
  static today = async (_req: Request, res: Response): Promise<void> => {
    const summary = await ReportsService.getTodayReport();
    ApiResponse.ok(res, summary, 'Today revenue summary retrieved successfully');
  };

  /**
   * GET /api/canteen/reports/top-customers
   */
  static topCustomers = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const list = await ReportsService.getTopCustomersList(limit);
    ApiResponse.ok(res, list, 'Top spending devotees list retrieved successfully');
  };

  /**
   * GET /api/canteen/reports/summary
   */
  static summary = async (req: Request, res: Response): Promise<void> => {
    const { startDate, endDate } = req.query;

    const startStr = startDate ? String(startDate) : undefined;
    const endStr = endDate ? String(endDate) : undefined;

    const summary = await ReportsService.getDateRangeReport(startStr, endStr);
    ApiResponse.ok(res, summary, 'Sales report retrieved successfully');
  };
}
