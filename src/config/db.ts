import mysql from 'mysql2/promise';
import { env } from '@config/env';

/**
 * MySQL high-performance connection pool — shared across all modules via singleton.
 *
 * Performance Optimizations:
 *   - pool.query instead of pool.execute (1 RTT per query instead of 3 RTTs)
 *   - enableKeepAlive: true to keep socket channels warm and prevent connection renegotiation
 *   - maxIdle: maintains pre-warmed idle connections for instant response
 *   - decimalNumbers: true to automatically parse MySQL DECIMAL columns to native JS numbers
 */
export const pool = mysql.createPool({
  host:                  env.DB_HOST,
  port:                  env.DB_PORT,
  user:                  env.DB_USER,
  password:              env.DB_PASSWORD,
  database:              env.DB_NAME,
  waitForConnections:    true,
  connectionLimit:       env.DB_POOL_MAX,
  maxIdle:               env.DB_POOL_MAX,
  idleTimeout:           60000,          // keep idle connections alive for 60s
  enableKeepAlive:       true,           // keep TCP sockets warm
  keepAliveInitialDelay: 10000,
  queueLimit:            0,
  connectTimeout:        env.DB_CONNECT_TIMEOUT,
  timezone:              '+03:00',       // East Africa Time (EAT / Uganda / UTC+3)
  charset:               'utf8mb4',
  namedPlaceholders:     true,
  decimalNumbers:        true,           // return DECIMAL columns as JS numbers
});

/**
 * Type-safe query helper using single-roundtrip query execution.
 * Avoids prepared statement roundtrip amplification on remote DB connections.
 */
export async function query<T>(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[],
): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

/**
 * Verifies the DB pool can reach MySQL and optimizes indexes on startup.
 */
export async function verifyDatabaseConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅  Database connection pool established (optimized for East Africa Time EAT / +03:00)');

    // Ensure session timezone is East Africa Time (EAT - Uganda / Kampala)
    try {
      await pool.query("SET time_zone = '+03:00'");
    } catch (_) {}

    // Ensure devotees table and profile columns exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS devotees (
          id char(36) NOT NULL PRIMARY KEY,
          first_name varchar(120) NOT NULL,
          last_name varchar(120) NOT NULL,
          email varchar(180) NOT NULL UNIQUE,
          phone varchar(25) NOT NULL UNIQUE,
          password_hash varchar(255) NOT NULL,
          membership_number varchar(30) NOT NULL UNIQUE,
          membership_type enum('Annual','Life','Patron') DEFAULT 'Annual',
          status enum('ACTIVE','PENDING','EXPIRED','SUSPENDED') DEFAULT 'ACTIVE',
          joined_date date NOT NULL,
          valid_until date NOT NULL,
          qr_code_url varchar(255) DEFAULT NULL,
          address varchar(255) DEFAULT NULL,
          city varchar(100) DEFAULT NULL,
          country varchar(100) DEFAULT 'Uganda',
          postal_code varchar(30) DEFAULT NULL,
          family_members text DEFAULT NULL,
          avatar_url text DEFAULT NULL,
          otp_code varchar(6) DEFAULT NULL,
          otp_expires_at datetime DEFAULT NULL,
          is_active tinyint(1) DEFAULT 1,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Ensure any missing columns in devotees table are added dynamically
      const [devoteeCols]: any = await pool.query('DESCRIBE devotees');
      const existingDevoteeCols = new Set(devoteeCols.map((c: any) => c.Field.toLowerCase()));

      const devoteeColumnDefs = [
        { name: 'address', def: 'varchar(255) DEFAULT NULL' },
        { name: 'city', def: 'varchar(100) DEFAULT NULL' },
        { name: 'country', def: "varchar(100) DEFAULT 'Uganda'" },
        { name: 'postal_code', def: 'varchar(30) DEFAULT NULL' },
        { name: 'family_members', def: 'text DEFAULT NULL' },
        { name: 'avatar_url', def: 'text DEFAULT NULL' },
        { name: 'otp_code', def: 'varchar(6) DEFAULT NULL' },
        { name: 'otp_expires_at', def: 'datetime DEFAULT NULL' },
        { name: 'is_active', def: 'tinyint(1) DEFAULT 1' },
      ];

      for (const col of devoteeColumnDefs) {
        if (!existingDevoteeCols.has(col.name.toLowerCase())) {
          await pool.query(`ALTER TABLE devotees ADD COLUMN ${col.name} ${col.def}`);
        }
      }
    } catch (_) {}

    // Ensure temple dynamic booking tables exist (Halls, Darshan Slots, Pujas & Bookings)
    try {
      // 1. Temple Halls Master Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS temple_halls (
          id char(36) NOT NULL PRIMARY KEY,
          name varchar(150) NOT NULL,
          description text DEFAULT NULL,
          capacity int NOT NULL DEFAULT 500,
          max_people_at_a_time int NOT NULL DEFAULT 500,
          space_sqft int NOT NULL DEFAULT 5000,
          price_per_day decimal(12,2) NOT NULL DEFAULT 1500000.00,
          price_per_half_day decimal(12,2) NOT NULL DEFAULT 950000.00,
          image_url text DEFAULT NULL,
          amenities text DEFAULT NULL,
          is_active tinyint(1) DEFAULT 1,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Temple Hall Bookings Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS temple_hall_bookings (
          id varchar(50) NOT NULL PRIMARY KEY,
          hall_id char(36) NOT NULL,
          hall_name varchar(150) NOT NULL,
          devotee_id char(36) DEFAULT NULL,
          devotee_name varchar(150) NOT NULL,
          devotee_email varchar(180) DEFAULT NULL,
          devotee_phone varchar(30) NOT NULL,
          event_title varchar(200) NOT NULL,
          booking_date date NOT NULL,
          duration_type enum('full','half','multi') DEFAULT 'full',
          duration_days int DEFAULT 1,
          start_time varchar(20) DEFAULT '09:00 AM',
          end_time varchar(20) DEFAULT '06:00 PM',
          expected_guests int DEFAULT 500,
          base_price decimal(12,2) NOT NULL DEFAULT 0.00,
          cleaning_fee decimal(12,2) NOT NULL DEFAULT 150000.00,
          deposit decimal(12,2) NOT NULL DEFAULT 0.00,
          total_price decimal(12,2) NOT NULL DEFAULT 0.00,
          status enum('PENDING','CONFIRMED','REJECTED','CANCELLED') DEFAULT 'PENDING',
          payment_status enum('PENDING','PAID','REFUNDED') DEFAULT 'PENDING',
          notes text DEFAULT NULL,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Temple Darshan Slots Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS temple_darshan_slots (
          id char(36) NOT NULL PRIMARY KEY,
          slot_name varchar(150) NOT NULL,
          start_time varchar(20) NOT NULL,
          end_time varchar(20) NOT NULL,
          max_visitors_limit int NOT NULL DEFAULT 100,
          time_zone varchar(50) NOT NULL DEFAULT 'EAT (Africa/Kampala)',
          description text DEFAULT NULL,
          badge varchar(50) DEFAULT NULL,
          is_active tinyint(1) DEFAULT 1,
          created_at datetime DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Temple Darshan Bookings Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS temple_darshan_bookings (
          id varchar(50) NOT NULL PRIMARY KEY,
          slot_id char(36) DEFAULT NULL,
          slot_name varchar(150) NOT NULL,
          devotee_id char(36) DEFAULT NULL,
          devotee_name varchar(150) NOT NULL,
          devotee_phone varchar(30) NOT NULL,
          devotee_email varchar(180) DEFAULT NULL,
          visit_date date NOT NULL,
          visitor_count int NOT NULL DEFAULT 1,
          qr_code_url text DEFAULT NULL,
          status enum('CONFIRMED','CHECKED_IN','CANCELLED') DEFAULT 'CONFIRMED',
          created_at datetime DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. Temple Pujas Master Catalog Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS temple_pujas (
          id char(36) NOT NULL PRIMARY KEY,
          name varchar(150) NOT NULL,
          category enum('Special','Abhishek','Daily','Homa','General') DEFAULT 'Special',
          description text DEFAULT NULL,
          base_price decimal(12,2) NOT NULL DEFAULT 50000.00,
          samagri_price decimal(12,2) NOT NULL DEFAULT 20000.00,
          duration_minutes int NOT NULL DEFAULT 60,
          priest_role varchar(100) DEFAULT 'Resident Mandir Shastri',
          image_url text DEFAULT NULL,
          is_active tinyint(1) DEFAULT 1,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. Temple Puja Bookings Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS temple_puja_bookings (
          id varchar(50) NOT NULL PRIMARY KEY,
          puja_id char(36) NOT NULL,
          puja_name varchar(150) NOT NULL,
          devotee_id char(36) DEFAULT NULL,
          devotee_name varchar(150) NOT NULL,
          devotee_phone varchar(30) DEFAULT NULL,
          devotee_email varchar(180) DEFAULT NULL,
          gothra varchar(100) DEFAULT 'Kashyap',
          nakshatra varchar(100) DEFAULT 'General',
          booking_date date NOT NULL,
          time_slot varchar(100) NOT NULL,
          has_samagri tinyint(1) DEFAULT 1,
          base_amount decimal(12,2) NOT NULL DEFAULT 0.00,
          samagri_amount decimal(12,2) NOT NULL DEFAULT 0.00,
          total_amount decimal(12,2) NOT NULL DEFAULT 0.00,
          priest_name varchar(150) DEFAULT 'Resident Mandir Shastri',
          status enum('CONFIRMED','COMPLETED','CANCELLED') DEFAULT 'CONFIRMED',
          payment_status enum('PAID','PENDING','REFUNDED') DEFAULT 'PAID',
          receipt_number varchar(50) NOT NULL,
          created_at datetime DEFAULT CURRENT_TIMESTAMP,
          updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Seed default halls if empty
      const [hallCountRows]: any = await pool.query('SELECT COUNT(*) as count FROM temple_halls');
      if (hallCountRows[0].count === 0) {
        await pool.query(`
          INSERT INTO temple_halls (id, name, description, capacity, max_people_at_a_time, space_sqft, price_per_day, price_per_half_day, image_url, amenities, is_active)
          VALUES 
          ('hall-main-01', 'Shree Swaminarayan Grand Auditorium', 'Spacious luxury air-conditioned auditorium with elevated royal stage, bridal suite, acoustic sound systems, and backup power generator.', 1200, 1200, 12500, 2500000.00, 1500000.00, 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=80', '["Central AC", "1200 Capacity", "Pure Veg Kitchen", "Homa Allowed", "Secure Parking", "Bridal Suite"]', 1),
          ('hall-dining-02', 'Radhe Krishna Devotional Dining Hall', 'Dedicated pure vegetarian catering and banquet facility equipped with industrial kitchen, washing bays, and dining tables.', 600, 600, 6000, 1200000.00, 750000.00, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=80', '["Pure Veg Kitchen", "Dining Setup", "600 Capacity", "Cold Storage", "Generator Backup"]', 1),
          ('hall-satsang-03', 'Ghanshyam Cultural & Satsang Bhavan', 'Intimate carpeted hall designed for spiritual discourses, meditation seminars, thread ceremonies, and bhajan mandals.', 300, 300, 3200, 800000.00, 500000.00, 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1000&q=80', '["Sound Acoustics", "300 Capacity", "Carpeted Flooring", "AC", "Puja Setup"]', 1)
        `);
      }

      // Seed default Darshan slots if empty
      const [slotCountRows]: any = await pool.query('SELECT COUNT(*) as count FROM temple_darshan_slots');
      if (slotCountRows[0].count === 0) {
        await pool.query(`
          INSERT INTO temple_darshan_slots (id, slot_name, start_time, end_time, max_visitors_limit, time_zone, description, badge, is_active)
          VALUES
          ('slot-01', 'Mangala Aarti & Dawn Darshan', '06:00 AM', '07:15 AM', 150, 'EAT (Africa/Kampala)', 'Begins with Mangala Aarti at dawn, followed by divine Abhishek.', 'Auspicious Dawn', 1),
          ('slot-02', 'Morning Darshan & Meditation', '08:00 AM', '10:30 AM', 300, 'EAT (Africa/Kampala)', 'General serene darshan and peaceful courtyard reading.', 'Peaceful Flow', 1),
          ('slot-03', 'Mid-Day Rajbhog Aarti', '11:30 AM', '12:30 PM', 200, 'EAT (Africa/Kampala)', 'Deity food offering celebration and midday blessing.', 'Noon Offering', 1),
          ('slot-04', 'Sandhya Evening Aarti & Kirtan', '06:30 PM', '08:00 PM', 400, 'EAT (Africa/Kampala)', 'Evening Sandhya Aarti with congregational kirtan.', 'Devotional Kirtan', 1),
          ('slot-05', 'Shayan Aarti & Night Darshan', '08:15 PM', '08:45 PM', 150, 'EAT (Africa/Kampala)', 'Final night closing prayer and peaceful retreat.', 'Final Aarti', 1)
        `);
      }

      // Seed default Pujas if empty
      const [pujaCountRows]: any = await pool.query('SELECT COUNT(*) as count FROM temple_pujas');
      if (pujaCountRows[0].count === 0) {
        await pool.query(`
          INSERT INTO temple_pujas (id, name, category, description, base_price, samagri_price, duration_minutes, priest_role, image_url, is_active)
          VALUES
          ('puja-01', 'Satyanarayan Maha Pooja', 'Special', 'Performed to invoke divine blessings for prosperity, health, peace of mind, and auspicious family harmony.', 75000.00, 20000.00, 120, 'Resident Mandir Shastri', 'https://images.unsplash.com/photo-1609358905581-e5382c473950?auto=format&fit=crop&w=600&q=80', 1),
          ('puja-02', 'Maha Abhishek Seva', 'Abhishek', 'Grand ceremonial bathing of the holy deities with sacred Panchamrita (milk, honey, curd, ghee, and holy waters).', 180000.00, 30000.00, 90, 'Senior Head Priest', 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?auto=format&fit=crop&w=600&q=80', 1),
          ('puja-03', 'Archana Seva (108 Names)', 'Daily', 'Chanting of the 108 holy names with fresh fragrant flowers offered at the sanctum.', 15000.00, 5000.00, 20, 'Assisting Priest', 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=600&q=80', 1),
          ('puja-04', 'Shringar & Aarti Seva', 'Daily', 'Sponsor daily divine deity decoration and attire, obtaining priority seating during Sandhya Aarti.', 110000.00, 25000.00, 60, 'Resident Mandir Shastri', 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=600&q=80', 1),
          ('puja-05', 'Sudarshana Maha Yagna / Homa', 'Homa', 'Sacred fire ritual using consecrated herbs and Vedic mantras to eliminate negative energies.', 380000.00, 60000.00, 180, 'Team of 3 Vedic Priests', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80', 1),
          ('puja-06', 'Navagraha Shanti Pooja', 'Special', 'Harmonize cosmic planetary influences to bring spiritual peace, mental clarity, and success.', 95000.00, 25000.00, 90, 'Resident Mandir Shastri', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80', 1)
        `);
      }
    } catch (tblErr) {
      console.error('Warning during temple booking tables initialization:', (tblErr as Error).message);
    }

    // Ensure schema optimization & indexes for high-speed queries
    try {
      await pool.query('ALTER TABLE canteen_menu_items MODIFY image_url TEXT DEFAULT NULL');
    } catch (_) {}

    // Add indexes on frequently filtered columns if not already present
    const indexQueries = [
      'CREATE INDEX idx_co_ordered_at ON canteen_orders(ordered_at)',
      'CREATE INDEX idx_co_status ON canteen_orders(order_status)',
      'CREATE INDEX idx_coi_order_id ON canteen_order_items(order_id)',
      'CREATE INDEX idx_cmi_category ON canteen_menu_items(category)',
      'CREATE INDEX idx_cmi_channel ON canteen_menu_items(channel)',
    ];

    for (const q of indexQueries) {
      try {
        await pool.query(q);
      } catch (_) {
        // Ignore duplicate index errors
      }
    }

    // Ensure views are created with current database definer
    try {
      await pool.query(`
        CREATE OR REPLACE VIEW canteen_vw_low_stock AS
        SELECT id, name, category, stock, unit, min_stock, supplier_id, unit_cost, updated_at
        FROM canteen_inventory
        WHERE stock <= min_stock
      `);
      await pool.query(`
        CREATE OR REPLACE VIEW canteen_vw_top_customers AS
        SELECT id, name, phone, email, customer_type, total_orders, total_spent
        FROM canteen_customers
        ORDER BY total_spent DESC
      `);
    } catch (_) {}
  } catch (err) {
    console.error('❌  Cannot connect to MySQL:', (err as Error).message);
    console.error('    Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
    process.exit(1);
  }
}

/**
 * Gracefully drain the pool on process shutdown.
 */
export async function closeDatabasePool(): Promise<void> {
  await pool.end();
  console.log('📴  Database pool closed');
}
