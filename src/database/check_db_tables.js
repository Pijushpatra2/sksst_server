const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function checkTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  const [tables] = await connection.query('SHOW TABLES');
  console.log('Database:', process.env.DB_NAME);
  console.log('Tables in DB:');
  tables.forEach((t) => console.log(Object.values(t)[0]));

  await connection.end();
}

checkTables().catch(console.error);
