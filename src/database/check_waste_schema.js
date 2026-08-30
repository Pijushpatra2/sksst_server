const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkWasteLog() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  const [createRes] = await connection.query('SHOW CREATE TABLE `canteen_waste_log`');
  console.log(createRes[0]['Create Table']);

  await connection.end();
}

checkWasteLog().catch(console.error);
