import pool from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
    try {
        console.log('Running migration...');
        // Check if columns already exist before adding
        const check = await pool.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'receipts'
            AND column_name IN ('arquivo_data', 'arquivo_mimetype', 'arquivo_nome')
        `);
        const existing = check.rows.map(r => r.column_name);

        const toAdd = [];
        if (!existing.includes('arquivo_data'))     toAdd.push('ADD COLUMN arquivo_data BYTEA');
        if (!existing.includes('arquivo_mimetype'))  toAdd.push('ADD COLUMN arquivo_mimetype VARCHAR(100)');
        if (!existing.includes('arquivo_nome'))      toAdd.push('ADD COLUMN arquivo_nome VARCHAR(255)');

        if (toAdd.length > 0) {
            await pool.query(`ALTER TABLE receipts ${toAdd.join(', ')}`);
            console.log('Migration completed successfully.');
        } else {
            console.log('Columns already exist. Skipping.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
