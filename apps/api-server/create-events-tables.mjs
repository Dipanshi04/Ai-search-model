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
    // Create events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE,
        description TEXT,
        date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL DEFAULT 'UPCOMING',
        branding TEXT,
        registrationOpen BOOLEAN NOT NULL DEFAULT true,
        maxParticipants INT,
        createdAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    console.log('Events table created');
    
    // Check if table exists now
    const result = await client.query(`SELECT id, name FROM events LIMIT 1`);
    console.log('Events table verified:', result.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

main();