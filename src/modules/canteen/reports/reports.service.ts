import { ReportsModel } from './reports.model';

/**
 * Service managing analytics dashboards and sales reports.
 */
export class ReportsService {
  static async getTodayReport() {
    return ReportsModel.getTodaySummary();
  }

  static async getTopCustomersList(limit?: number) {
    const lim = limit || 10;
    return ReportsModel.getTopCustomers(lim);
  }

  static async getDateRangeReport(startDate: string, endDate: string) {
    return ReportsModel.getDateRangeSummary(startDate, endDate);
  }
}
