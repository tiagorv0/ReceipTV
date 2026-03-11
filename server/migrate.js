import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    try {
        console.log('Running migration...');
        await pool.execute('ALTER TABLE receipts ADD COLUMN arquivo_data LONGBLOB, ADD COLUMN arquivo_mimetype VARCHAR(100)');
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Columns already exist. Skipping.');
            process.exit(0);
        }
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
