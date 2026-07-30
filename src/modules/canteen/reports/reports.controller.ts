import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ApiError } from '@utils/ApiError';
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

    if (!startDate || !endDate) {
      throw ApiError.badRequest('Both startDate and endDate query parameters are required');
    }

    const startStr = String(startDate);
    const endStr = String(endDate);

    // Simple date pattern validation (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startStr) || !datePattern.test(endStr)) {
      throw ApiError.badRequest('Dates must be in YYYY-MM-DD format');
    }

    const summary = await ReportsService.getDateRangeReport(startStr, endStr);
    ApiResponse.ok(res, summary, `Summary for range ${startStr} to ${endStr} retrieved successfully`);
  };
}
