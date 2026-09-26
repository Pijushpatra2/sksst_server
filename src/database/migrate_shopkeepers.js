const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function migrateShopkeepers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sksstdatabase',
  });

  console.log('Connected to MySQL database:', process.env.DB_NAME);

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS shopkeepers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      phone VARCHAR(30) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'SHOPKEEPER',
      store_name VARCHAR(100) NULL DEFAULT 'Main Temple Gift & Book Store',
      status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      avatar_url VARCHAR(500) NULL,
      address VARCHAR(255) NULL,
      created_by INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login DATETIME NULL,
      INDEX idx_shopkeepers_email (email),
      INDEX idx_shopkeepers_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await connection.query(createTableSql);
  console.log('✅ Table `shopkeepers` created / verified.');

  // Seed a default shopkeeper account if none exists
  const [existing] = await connection.query('SELECT id, email FROM shopkeepers WHERE email = ?', ['shopkeeper@sksstkampala.org']);
  
  if (existing.length === 0) {
    const saltRounds = 10;
    const defaultPassword = 'Shop@123456';
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
    const id = crypto.randomUUID();

    await connection.query(
      `INSERT INTO shopkeepers (id, name, email, phone, password_hash, role, store_name, status, is_active)
       VALUES (?, ?, ?, ?, ?, 'SHOPKEEPER', 'Main Temple Gift & Book Store', 'ACTIVE', 1)`,
      [id, 'Main Mandir Shopkeeper', 'shopkeeper@sksstkampala.org', '+256 700 888999', passwordHash]
    );

    console.log('✅ Seeded default shopkeeper: shopkeeper@sksstkampala.org / Shop@123456');
  } else {
    console.log('ℹ️ Default shopkeeper already exists.');
  }

  await connection.end();
  console.log('Migration complete.');
}

migrateShopkeepers().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
