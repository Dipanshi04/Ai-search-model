import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'isa_marathon',
  user: 'isa',
  password: 'isa_password'
});

async function main() {
  const client = await pool.connect();
  try {
    const result = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`);
    console.log('Tables:', result.rows.map(r => r.table_name));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

main();