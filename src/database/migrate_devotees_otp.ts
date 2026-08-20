import { pool } from '../config/db';

async function migrate() {
  console.log('Starting DB migration: Adding OTP columns to `devotees` table...');
  const connection = await pool.getConnection();
  try {
    const alterTableSql1 = `
      ALTER TABLE devotees 
        ADD COLUMN IF NOT EXISTS otp_code varchar(6) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS otp_expires_at datetime DEFAULT NULL;
    `;

    await connection.execute(alterTableSql1);
    console.log('✅  OTP columns added successfully to `devotees` table!');
  } catch (err: any) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
