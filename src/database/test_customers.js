const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function testCustomers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('✅ Connected to database:', process.env.DB_NAME);

  const [rows] = await connection.query('SELECT COUNT(*) as count FROM canteen_customers');
  console.log(`✅ Total canteen customers in DB: ${rows[0].count}`);

  const [sample] = await connection.query('SELECT * FROM canteen_customers LIMIT 3');
  console.log('✅ Sample customer records:');
  console.log(sample);

  await connection.end();
}

testCustomers().catch(console.error);
