import { Pool } from 'pg';
import * as http from 'http';

const data = JSON.stringify({ email: 'admin@isamarathon.com', password: 'admin123' });

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/v1/auth/admin-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

const req = http.request(options, (res) => {
  let responseData = '';
  res.on('data', (chunk) => { responseData += chunk; });
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Response: ${responseData}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();