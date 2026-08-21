import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

async function main() {
  // The hash from the database
  const storedHash = '$2a$10$zGKux0SBfknEGi0Y9IVdnu.T0XM0mK8P6M3r/1PLxlNzbNPjsMr1y';
  
  // Test the password
  const isValid = bcrypt.compareSync('admin123', storedHash);
  console.log('Password match:', isValid);
  
  // Also test a wrong password
  const isInvalid = bcrypt.compareSync('wrongpassword', storedHash);
  console.log('Wrong password match:', isInvalid);
}

main();