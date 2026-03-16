import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // desativa prepared statements para funcionar com pgbouncer
  statement_timeout: 10000,
});

export default pool;
