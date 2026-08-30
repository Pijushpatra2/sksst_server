const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testShop() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'puja_software',
  });

  console.log('✅ Connected to MySQL database successfully!');

  const [products] = await connection.query('SELECT id, name, price, stock, category_id FROM shop_products');
  console.log('✅ shop_products:', products.length, 'records');

  const [categories] = await connection.query('SELECT id, name, slug FROM shop_categories');
  console.log('✅ shop_categories:', categories.length, 'records');

  const [coupons] = await connection.query('SELECT code, discount_type, value, active FROM shop_coupons');
  console.log('✅ shop_coupons:', coupons.length, 'records');

  const [orders] = await connection.query('SELECT id, customer_name, total, status FROM shop_orders');
  console.log('✅ shop_orders:', orders.length, 'records');

  const [customers] = await connection.query('SELECT id, name, total_spent, orders_count FROM shop_customers');
  console.log('✅ shop_customers:', customers.length, 'records');

  const [reviews] = await connection.query('SELECT id, customer_name, rating, comment FROM shop_reviews');
  console.log('✅ shop_reviews:', reviews.length, 'records');

  await connection.end();
}

testShop().catch(console.error);
