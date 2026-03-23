import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    try {
        console.log('Running email migration...');

        const check = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'email'
        `);

        if (check.rows.length > 0) {
            console.log('Column email already exists. Skipping.');
            process.exit(0);
        }

        const existingUsers = await pool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(existingUsers.rows[0].count);

        if (userCount > 0) {
            await pool.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255)`);
            await pool.query(`UPDATE users SET email = username || '@placeholder.local' WHERE email IS NULL`);
            await pool.query(`ALTER TABLE users ALTER COLUMN email SET NOT NULL`);
            await pool.query(`ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)`);
            console.log(`Migration completed. ${userCount} existing user(s) received placeholder email — update them manually.`);
        } else {
            await pool.query(`ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL UNIQUE`);
            console.log('Migration completed successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
