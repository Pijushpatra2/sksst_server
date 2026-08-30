const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testSalesReport() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('✅ Connected to database:', process.env.DB_NAME);

  const [summary] = await connection.query(`
    SELECT 
      COUNT(*) AS total_orders,
      COUNT(CASE WHEN payment_status = 'PAID' AND order_status != 'CANCELLED' THEN 1 END) AS paid_orders,
      COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND order_status != 'CANCELLED' THEN total_amount ELSE 0 END), 0) AS gross_revenue,
      COALESCE(AVG(CASE WHEN payment_status = 'PAID' AND order_status != 'CANCELLED' THEN total_amount END), 0) AS avg_order_value
    FROM canteen_orders
  `);
  console.log('✅ Accurate Summary Metrics from Database:');
  console.log(summary[0]);

  const [paymentBreakdown] = await connection.query(`
    SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
    FROM canteen_orders
    WHERE payment_status = 'PAID' AND order_status != 'CANCELLED'
    GROUP BY payment_method
  `);
  console.log('✅ Payment Method Breakdown:');
  console.log(paymentBreakdown);

  const [itemsSold] = await connection.query(`
    SELECT i.item_name, SUM(i.quantity) as qty_sold, SUM(i.line_total) as revenue
    FROM canteen_order_items i
    INNER JOIN canteen_orders o ON i.order_id = o.id
    WHERE o.payment_status = 'PAID' AND o.order_status != 'CANCELLED'
    GROUP BY i.item_name
    ORDER BY revenue DESC
    LIMIT 5
  `);
  console.log('✅ Top Selling Items Breakdown:');
  console.log(itemsSold);

  await connection.end();
}

testSalesReport().catch(console.error);
