const mysql = require('mysql2/promise');
require('dotenv').config();
async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pujasoftware'
  });
  await connection.execute('CREATE TABLE IF NOT EXISTS products ( id CHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, slug VARCHAR(255) NOT NULL UNIQUE, description TEXT, category_id VARCHAR(100), price DECIMAL(10,2) NOT NULL, stock INT NOT NULL DEFAULT 0, images JSON, rating DECIMAL(3,2) DEFAULT 5.0, reviews_count INT DEFAULT 0, specs JSON, is_featured BOOLEAN DEFAULT FALSE, is_new BOOLEAN DEFAULT TRUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP );');
  console.log('Products table created.');
  await connection.end();
}
main();
