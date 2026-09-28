const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateRequisitions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('Connected to MySQL database:', process.env.DB_NAME);

  // 1. Check existing columns in store_requisitions
  const [reqCols] = await connection.query('DESCRIBE store_requisitions');
  const existingReqCols = new Set(reqCols.map((c) => c.Field.toLowerCase()));

  const reqColumnDefs = [
    { name: 'target_shopkeeper_type', def: "ENUM('MANUAL', 'REGISTERED') NOT NULL DEFAULT 'MANUAL'" },
    { name: 'target_shopkeeper_email', def: 'VARCHAR(150) NULL' },
    { name: 'target_shopkeeper_phone', def: 'VARCHAR(50) NULL' },
    { name: 'total_amount', def: 'DECIMAL(14,2) NOT NULL DEFAULT 0.00' },
  ];

  for (const col of reqColumnDefs) {
    if (!existingReqCols.has(col.name.toLowerCase())) {
      console.log(`Adding column \`${col.name}\` to \`store_requisitions\`...`);
      await connection.query(`ALTER TABLE store_requisitions ADD COLUMN ${col.name} ${col.def}`);
      console.log(`✅ Added \`${col.name}\` to \`store_requisitions\``);
    } else {
      console.log(`ℹ️ Column \`${col.name}\` already exists in \`store_requisitions\``);
    }
  }

  // 2. Check existing columns in store_requisition_items
  const [itemCols] = await connection.query('DESCRIBE store_requisition_items');
  const existingItemCols = new Set(itemCols.map((c) => c.Field.toLowerCase()));

  const itemColumnDefs = [
    { name: 'unit_price', def: 'DECIMAL(12,2) NOT NULL DEFAULT 0.00' },
    { name: 'total_price', def: 'DECIMAL(14,2) NOT NULL DEFAULT 0.00' },
  ];

  for (const col of itemColumnDefs) {
    if (!existingItemCols.has(col.name.toLowerCase())) {
      console.log(`Adding column \`${col.name}\` to \`store_requisition_items\`...`);
      await connection.query(`ALTER TABLE store_requisition_items ADD COLUMN ${col.name} ${col.def}`);
      console.log(`✅ Added \`${col.name}\` to \`store_requisition_items\``);
    } else {
      console.log(`ℹ️ Column \`${col.name}\` already exists in \`store_requisition_items\``);
    }
  }

  console.log('✅ Requisitions pricing and manual storekeeper migration completed successfully!');
  await connection.end();
}

migrateRequisitions().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
