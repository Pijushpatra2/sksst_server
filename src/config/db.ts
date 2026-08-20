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
  timezone:              '+00:00',
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
    console.log('✅  Database connection pool established (optimized with keep-alive & single-RTT)');

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
