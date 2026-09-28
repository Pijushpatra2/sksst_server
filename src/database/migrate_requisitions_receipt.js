const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateReceiptColumns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('Connected to MySQL database:', process.env.DB_NAME);

  // Check existing columns in store_requisitions
  const [reqCols] = await connection.query('DESCRIBE store_requisitions');
  const existingReqCols = new Set(reqCols.map((c) => c.Field.toLowerCase()));

  const receiptColumnDefs = [
    { name: 'receipt_url', def: 'TEXT NULL' },
    { name: 'receipt_filename', def: 'VARCHAR(255) NULL' },
    { name: 'receipt_uploaded_at', def: 'DATETIME NULL' },
    { name: 'receipt_uploaded_by', def: 'VARCHAR(150) NULL' },
    { name: 'receipt_notes', def: 'TEXT NULL' },
  ];

  for (const col of receiptColumnDefs) {
    if (!existingReqCols.has(col.name.toLowerCase())) {
      console.log(`Adding column \`${col.name}\` to \`store_requisitions\`...`);
      await connection.query(`ALTER TABLE store_requisitions ADD COLUMN ${col.name} ${col.def}`);
      console.log(`✅ Added \`${col.name}\` to \`store_requisitions\``);
    } else {
      console.log(`ℹ️ Column \`${col.name}\` already exists in \`store_requisitions\``);
    }
  }

  console.log('✅ Requisitions receipt columns migration completed successfully!');
  await connection.end();
}

migrateReceiptColumns().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
