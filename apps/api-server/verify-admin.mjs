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
    const result = await client.query(`SELECT id, email, role, passwordHash FROM users WHERE email = 'admin@isamarathon.com'`);
    console.log('Admin user:', result.rows[0]);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

main();