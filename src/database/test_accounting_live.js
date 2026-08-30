const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');

async function testAccounting() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('✅ Connected to database:', process.env.DB_NAME);

  const [canteenRevenue] = await connection.query("SELECT COALESCE(SUM(total_amount), 0) as total FROM canteen_orders WHERE payment_status = 'PAID'");
  console.log('✅ Canteen Revenue from DB:', canteenRevenue[0].total);

  const [wasteLoss] = await connection.query("SELECT COALESCE(SUM(estimated_cost), 0) as total FROM canteen_waste_log");
  console.log('✅ Waste Loss from canteen_waste_log:', wasteLoss[0].total);

  const [inventoryValue] = await connection.query("SELECT COALESCE(SUM(stock * COALESCE(unit_cost, 0)), 0) as total FROM canteen_inventory");
  console.log('✅ Inventory Cost from canteen_inventory:', inventoryValue[0].total);

  const [shopRevenue] = await connection.query("SELECT COALESCE(SUM(total), 0) as total FROM shop_orders WHERE payment_status = 'PAID'");
  console.log('✅ Shop Revenue from DB:', shopRevenue[0].total);

  await connection.end();
}

testAccounting().catch(console.error);
