const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testInventory() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('✅ Connected to MySQL database:', process.env.DB_NAME);

  // 1. Check existing items
  const [existingItems] = await connection.query('SELECT * FROM canteen_inventory LIMIT 5');
  console.log(`✅ Current inventory rows count: ${existingItems.length}`);

  // 2. Insert a test inventory item
  const testId = 'test-inv-' + Date.now();
  await connection.query(
    'INSERT INTO canteen_inventory (id, name, category, stock, unit, min_stock, unit_cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [testId, 'Organic Desi Cow Ghee', 'Dairy', 25.0, 'kg', 5.0, 4500.0]
  );
  console.log('✅ Created test inventory item:', testId);

  // 3. Update test inventory item
  await connection.query(
    'UPDATE canteen_inventory SET stock = ?, min_stock = ? WHERE id = ?',
    [30.0, 8.0, testId]
  );
  console.log('✅ Updated test inventory item stock to 30.0');

  // 4. Delete test item
  await connection.query('DELETE FROM canteen_inventory WHERE id = ?', [testId]);
  console.log('✅ Deleted test inventory item');

  await connection.end();
}

testInventory().catch(console.error);
