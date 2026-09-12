import { pool } from '../config/db';

async function migrateDevoteeColumns() {
  console.log('Inspecting `devotees` table schema...');
  try {
    const [cols]: any = await pool.query('DESCRIBE devotees');
    console.log('Existing columns in devotees table:', cols.map((c: any) => c.Field));
    const existing = new Set(cols.map((c: any) => c.Field.toLowerCase()));

    const missingColumns = [
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

    for (const col of missingColumns) {
      if (!existing.has(col.name.toLowerCase())) {
        console.log(`Adding missing column '${col.name}'...`);
        await pool.query(`ALTER TABLE devotees ADD COLUMN ${col.name} ${col.def}`);
        console.log(`✅  Successfully added column '${col.name}'`);
      }
    }

    const [updatedCols]: any = await pool.query('DESCRIBE devotees');
    console.log('✅  Migration complete! Current columns in devotees table:', updatedCols.map((c: any) => c.Field));
  } catch (err: any) {
    console.error('❌  Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrateDevoteeColumns();
