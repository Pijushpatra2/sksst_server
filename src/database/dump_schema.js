const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function getTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'puja_software',
  });

  const [tables] = await connection.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0])[0];
  const tableNames = tables.map((t) => t[tableKey]);

  console.log('--- ALL TABLES ---');
  console.log(JSON.stringify(tableNames, null, 2));

  for (const table of tableNames) {
    const [createRes] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
    console.log(`\n================= TABLE: ${table} =================`);
    console.log(createRes[0]['Create Table']);
  }

  await connection.end();
}

getTables().catch(console.error);
