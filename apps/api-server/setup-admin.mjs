import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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
    // Check current tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
   `);
    console.log('Existing tables:', tables.rows.map(t => t.table_name));
    
    // Create users table based on Prisma schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(255),
        passwordHash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'PARTICIPANT',
        createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
   `);
    console.log('Users table created');
    
    // Insert admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await client.query(
      `INSERT INTO users (name, email, phone, passwordHash, role) 
       VALUES ('Admin User', 'admin@isamarathon.com', '+919876543210', $1, 'SUPER_ADMIN') 
       RETURNING id, email, role`,
      [hashedPassword]
    );
    console.log('Admin user inserted:', result.rows[0]);
    
    // Verify
    const verify = await client.query(`SELECT id, email, role FROM users WHERE email = 'admin@isamarathon.com'`);
    console.log('Verified admin:', verify.rows[0]);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

main();