const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateShop() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pujasoftware',
  });

  console.log('🚀 Running shop tables migration...');

  // 1. shop_categories
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_categories (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(150) NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 2. shop_products
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      category_id VARCHAR(100),
      price DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      images JSON,
      rating DECIMAL(3,2) DEFAULT 5.00,
      reviews_count INT DEFAULT 0,
      specs JSON,
      is_featured TINYINT(1) DEFAULT 0,
      is_new TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 3. shop_customers
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_customers (
      id CHAR(36) PRIMARY KEY,
      devotee_id CHAR(36) NULL,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) NOT NULL,
      phone VARCHAR(50) NULL,
      total_spent DECIMAL(12,2) DEFAULT 0.00,
      orders_count INT DEFAULT 0,
      address TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 4. shop_orders
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_orders (
      id VARCHAR(50) PRIMARY KEY,
      customer_id CHAR(36) NULL,
      devotee_id CHAR(36) NULL,
      customer_name VARCHAR(200) NOT NULL,
      customer_email VARCHAR(200) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      shipping_address JSON NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      discount DECIMAL(10,2) DEFAULT 0.00,
      tax DECIMAL(10,2) DEFAULT 0.00,
      shipping_fee DECIMAL(10,2) DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      payment_status VARCHAR(50) DEFAULT 'PAID',
      status VARCHAR(50) DEFAULT 'PENDING',
      tracking_number VARCHAR(100) NULL,
      timeline JSON NULL,
      coupon_code VARCHAR(50) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 5. shop_order_items
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_order_items (
      id CHAR(36) PRIMARY KEY,
      order_id VARCHAR(50) NOT NULL,
      product_id CHAR(36) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      product_image TEXT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. shop_coupons
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_coupons (
      id CHAR(36) PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      discount_type ENUM('PERCENT', 'FIXED') NOT NULL DEFAULT 'PERCENT',
      value DECIMAL(10,2) NOT NULL,
      min_spend DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      description TEXT,
      active TINYINT(1) DEFAULT 1,
      expires_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 7. shop_reviews
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS shop_reviews (
      id CHAR(36) PRIMARY KEY,
      product_id CHAR(36) NOT NULL,
      customer_name VARCHAR(200) NOT NULL,
      rating INT NOT NULL,
      comment TEXT NOT NULL,
      verified_purchase TINYINT(1) DEFAULT 1,
      status VARCHAR(50) DEFAULT 'APPROVED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing data from temporary `products` table if it exists
  try {
    await connection.execute(`
      INSERT IGNORE INTO shop_products (id, name, slug, description, category_id, price, stock, images, rating, reviews_count, specs, is_featured, is_new, created_at, updated_at)
      SELECT id, name, slug, description, category_id, price, stock, images, rating, reviews_count, specs, is_featured, is_new, created_at, updated_at FROM products;
    `);
  } catch (err) {
    // Ignore if products table doesn't exist
  }

  // Seed default categories
  const defaultCategories = [
    { id: 'cat-idols', name: 'Divine Idols & Murti', slug: 'divine-idols', description: 'Sacred brass, marble and pancha-dhatu deities for home mandir.' },
    { id: 'cat-incense', name: 'Incense & Fragrance', slug: 'incense-dhoop', description: 'Natural chandan, sambrani dhoop and pure havan samagri.' },
    { id: 'cat-books', name: 'Spiritual Literature', slug: 'spiritual-books', description: 'Shikshapatri, Vachanamrut, and sacred scriptures.' },
    { id: 'cat-mala', name: 'Puja Utensils & Mala', slug: 'puja-mala', description: 'Original Tulsi mala, gaumukhi bags, and brass aarti lamps.' },
    { id: 'cat-sweets', name: 'Temple Prasadam & Sweets', slug: 'temple-prasadam', description: 'Fresh, sacred thal offerings and traditional sweets.' },
  ];

  for (const cat of defaultCategories) {
    await connection.execute(`
      INSERT INTO shop_categories (id, name, slug, description, image_url)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);
    `, [cat.id, cat.name, cat.slug, cat.description, 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=600']);
  }

  // Seed default coupons
  const defaultCoupons = [
    { id: 'coup-1', code: 'TEMPLE10', discount_type: 'PERCENT', value: 10, min_spend: 500, description: '10% discount on orders above UGX 500' },
    { id: 'coup-2', code: 'DEVOTION50', discount_type: 'FIXED', value: 50, min_spend: 1000, description: 'UGX 50 discount on orders above UGX 1,000' },
    { id: 'coup-3', code: 'SEVA20', discount_type: 'PERCENT', value: 20, min_spend: 2500, description: 'Special 20% discount on sacred festival orders above UGX 2,500' },
  ];

  for (const coup of defaultCoupons) {
    await connection.execute(`
      INSERT INTO shop_coupons (id, code, discount_type, value, min_spend, description, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE value=VALUES(value), min_spend=VALUES(min_spend);
    `, [coup.id, coup.code, coup.discount_type, coup.value, coup.min_spend, coup.description]);
  }

  console.log('✅ All shop tables successfully created and seeded with shop_ prefix isolation!');
  await connection.end();
}

migrateShop().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
