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
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.getDateRangeSummary(todayStr, todayStr);
  }

  /**
   * Fetch top spender devotee customers list.
   */
  static async getTopCustomers(limit = 10): Promise<any[]> {
    const limitVal = Math.max(1, Math.min(1000, Number(limit) || 10));
    return query<any[]>(
      `SELECT id, name, phone, email, customer_type, total_orders, total_spent 
       FROM canteen_customers 
       ORDER BY total_spent DESC 
       LIMIT ${limitVal}`
    );
  }

  /**
   * Aggregate order quantities, count total orders, average tickets, discounts, and item-wise sales.
   */
  static async getDateRangeSummary(startDate?: string, endDate?: string): Promise<any> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (startDate && endDate) {
      conditions.push('DATE(o.ordered_at) >= ? AND DATE(o.ordered_at) <= ?');
      values.push(startDate, endDate);
    } else if (startDate) {
      conditions.push('DATE(o.ordered_at) >= ?');
      values.push(startDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Overall Summary Totals
    const summarySql = `
      SELECT 
        COUNT(*)                                                             AS total_orders,
        COUNT(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN 1 END) AS paid_orders,
        COUNT(CASE WHEN o.order_status = 'CANCELLED' THEN 1 END)             AS cancelled_orders,
        COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN o.total_amount ELSE 0 END), 0) AS gross_revenue,
        COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN o.subtotal ELSE 0 END), 0)     AS total_subtotal,
        COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN o.discount_amount ELSE 0 END), 0) AS total_discounts,
        COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN o.tax_amount ELSE 0 END), 0)  AS total_tax,
        COALESCE(SUM(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN o.service_charge ELSE 0 END), 0) AS total_service_charge,
        COALESCE(AVG(CASE WHEN o.payment_status = 'PAID' AND o.order_status != 'CANCELLED' THEN o.total_amount END), 0)        AS avg_order_value,
        COUNT(DISTINCT CASE WHEN o.customer_id IS NOT NULL THEN o.customer_id END) AS unique_customers
      FROM canteen_orders o
      ${whereClause}`;

    const summaryRows = await query<any[]>(summarySql, values);
    const summary = summaryRows[0] || {};

    // 2. Payment Method Breakdown
    const paySql = `
      SELECT 
        o.payment_method,
        COUNT(*) AS orders_count,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue
      FROM canteen_orders o
      ${whereClause ? whereClause + " AND o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'" : "WHERE o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'"}
      GROUP BY o.payment_method`;

    const payRows = await query<any[]>(paySql, values);
    const paymentMethods: Record<string, { count: number; revenue: number }> = {
      CASH: { count: 0, revenue: 0 },
      UPI: { count: 0, revenue: 0 },
      CARD: { count: 0, revenue: 0 },
    };
    payRows.forEach((r) => {
      paymentMethods[r.payment_method || 'CASH'] = {
        count: Number(r.orders_count || 0),
        revenue: Number(r.total_revenue || 0),
      };
    });

    // 3. Item-Wise Sales Breakdown
    const itemSql = `
      SELECT 
        i.item_name,
        COALESCE(SUM(i.quantity), 0)   AS quantity_sold,
        COALESCE(SUM(i.line_total), 0) AS total_revenue,
        COALESCE(AVG(i.item_price), 0) AS avg_unit_price
      FROM canteen_order_items i
      INNER JOIN canteen_orders o ON i.order_id = o.id
      ${whereClause ? whereClause + " AND o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'" : "WHERE o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'"}
      GROUP BY i.item_name
      ORDER BY total_revenue DESC
      LIMIT 50`;

    const itemSales = await query<any[]>(itemSql, values);
    const totalItemsSold = itemSales.reduce((sum, it) => sum + Number(it.quantity_sold || 0), 0);

    // 4. Daily Sales Timeline
    const dailySql = `
      SELECT 
        DATE(o.ordered_at) AS sale_date,
        COUNT(*) AS orders_count,
        COALESCE(SUM(o.total_amount), 0) AS daily_revenue
      FROM canteen_orders o
      ${whereClause ? whereClause + " AND o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'" : "WHERE o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'"}
      GROUP BY DATE(o.ordered_at)
      ORDER BY sale_date DESC
      LIMIT 30`;

    const dailyTrend = await query<any[]>(dailySql, values);

    // 5. Orders Detailed List for Ledger
    const ordersSql = `
      SELECT 
        o.id,
        o.token_number,
        o.customer_name,
        o.customer_phone,
        o.table_name,
        o.subtotal,
        o.discount_amount,
        o.tax_amount,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.ordered_at
      FROM canteen_orders o
      ${whereClause}
      ORDER BY o.ordered_at DESC
      LIMIT 500`;

    const ordersList = await query<any[]>(ordersSql, values);

    return {
      summary: {
        totalOrders: Number(summary.total_orders || 0),
        paidOrders: Number(summary.paid_orders || 0),
        cancelledOrders: Number(summary.cancelled_orders || 0),
        grossRevenue: Number(summary.gross_revenue || 0),
        subtotal: Number(summary.total_subtotal || 0),
        discount: Number(summary.total_discounts || 0),
        tax: Number(summary.total_tax || 0),
        serviceCharge: Number(summary.total_service_charge || 0),
        averageOrderValue: Number(summary.avg_order_value || 0),
        totalItemsSold,
        uniqueCustomers: Number(summary.unique_customers || 0),
      },
      paymentMethods,
      itemSales: itemSales.map((it) => ({
        name: it.item_name,
        quantity: Number(it.quantity_sold || 0),
        revenue: Number(it.total_revenue || 0),
        unitPrice: Number(it.avg_unit_price || 0),
      })),
      dailyTrend: dailyTrend.map((d) => ({
        date: d.sale_date ? new Date(d.sale_date).toISOString().slice(0, 10) : '',
        ordersCount: Number(d.orders_count || 0),
        revenue: Number(d.daily_revenue || 0),
      })),
      orders: ordersList.map((o) => ({
        id: o.id,
        tokenNumber: o.token_number,
        customerName: o.customer_name || 'Walk-in Devotee',
        customerPhone: o.customer_phone || '—',
        tableName: o.table_name || 'Counter Token',
        subtotal: Number(o.subtotal || 0),
        discount: Number(o.discount_amount || 0),
        tax: Number(o.tax_amount || 0),
        total: Number(o.total_amount || 0),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        orderedAt: o.ordered_at ? new Date(o.ordered_at).toISOString() : new Date().toISOString(),
        date: o.ordered_at ? new Date(o.ordered_at).toISOString().slice(0, 10) : '',
        time: o.ordered_at ? new Date(o.ordered_at).toLocaleTimeString() : '',
      })),
    };
  }
}
