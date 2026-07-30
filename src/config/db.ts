import mysql from 'mysql2/promise';
import { env } from '@config/env';

/**
 * MySQL connection pool — shared across all modules via this singleton.
 *
 * Uses mysql2's promise-based API so all queries are async/await compatible.
 * Pool is created once on import and reused for the lifetime of the process.
 *
 * Load-balancing note:
 * Each PM2 cluster worker maintains its own pool.
 * Total DB connections = DB_POOL_MAX × number of CPU cores.
 * Keep DB_POOL_MAX conservative (default 20) to avoid overwhelming MySQL.
 */
export const pool = mysql.createPool({
  host:               env.DB_HOST,
  port:               env.DB_PORT,
  user:               env.DB_USER,
  password:           env.DB_PASSWORD,
  database:           env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    env.DB_POOL_MAX,
  queueLimit:         0,             // unlimited queue
  connectTimeout:     env.DB_CONNECT_TIMEOUT,
  timezone:           '+00:00',      // always store UTC
  charset:            'utf8mb4',
  namedPlaceholders:  true,          // use :name syntax in queries
});

/**
 * Type-safe query helper.
 * Usage:
 *   const rows = await query<CanteenOrder[]>('SELECT * FROM canteen_orders WHERE id = ?', [id]);
 */
export async function query<T>(
  sql: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any[],
): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

/**
 * Verifies the DB pool can reach MySQL.
 * Called once on server startup — exits process if DB is unreachable.
 */
export async function verifyDatabaseConnection(): Promise<void> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅  Database connection pool established');

    // Ensure canteen_menu_items.image_url is TEXT type so long image URLs never truncate
    try {
      await pool.query('ALTER TABLE canteen_menu_items MODIFY image_url TEXT DEFAULT NULL');
    } catch (e) {
      // Ignore if table schema already modified or lacks alter privilege
    }
  } catch (err) {
    console.error('❌  Cannot connect to MySQL:', (err as Error).message);
    console.error('    Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env');
    process.exit(1);
  }
}

/**
 * Gracefully drain the pool on process shutdown.
 * Called by server.ts on SIGTERM / SIGINT.
 */
export async function closeDatabasePool(): Promise<void> {
  await pool.end();
  console.log('📴  Database pool closed');
}
