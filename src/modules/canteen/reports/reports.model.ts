import { query } from '@config/db';

/**
 * Model helper queries for Canteen Analytics and Business Reports.
 * Interacts with database views and aggregates values directly.
 */
export class ReportsModel {
  /**
   * Fetch today's revenue summary cards metrics.
   */
  static async getTodaySummary(): Promise<any> {
    const rows = await query<any[]>('SELECT * FROM canteen_vw_today_revenue LIMIT 1');
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Fetch top spender devotee customers list.
   */
  static async getTopCustomers(limit = 10): Promise<any[]> {
    const limitVal = Math.max(1, Math.min(1000, Number(limit) || 10));
    return query<any[]>(
      `SELECT * FROM canteen_vw_top_customers LIMIT ${limitVal}`
    );
  }

  /**
   * Aggregate order quantities, count total orders, average tickets, and discounts within a date range.
   */
  static async getDateRangeSummary(startDate: string, endDate: string): Promise<any> {
    const sql = `
      SELECT 
        COUNT(*)                                       AS total_orders,
        COALESCE(SUM(total_amount), 0)                 AS gross_revenue,
        COALESCE(SUM(discount_amount), 0)              AS total_discounts,
        COALESCE(SUM(tax_amount), 0)                   AS total_tax,
        COALESCE(SUM(service_charge), 0)               AS total_service_charge,
        COALESCE(AVG(total_amount), 0)                 AS avg_order_value,
        COUNT(DISTINCT customer_id)                    AS unique_customers
      FROM canteen_orders
      WHERE DATE(ordered_at) >= ? 
        AND DATE(ordered_at) <= ?
        AND payment_status = 'PAID'
        AND order_status != 'CANCELLED'`;

    const rows = await query<any[]>(sql, [startDate, endDate]);
    return rows.length > 0 ? rows[0] : null;
  }
}
