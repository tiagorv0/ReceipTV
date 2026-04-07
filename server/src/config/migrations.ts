import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const { default: pool } = await import('./database.js');
const { default: logger } = await import('./logger.js');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ  DEFAULT NOW()
      )
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query<{ version: string }>('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map(r => r.version));

    const pending = files.filter(f => !applied.has(path.basename(f, '.sql')));

    if (pending.length === 0) {
      logger.info('Migrations: nenhuma migration pendente.');
      return;
    }

    for (const file of pending) {
      const version = path.basename(file, '.sql');
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      logger.info(`Migrations: aplicando ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version],
        );
        await client.query('COMMIT');
        logger.info(`Migrations: ${file} aplicada com sucesso.`);
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(`Migrations: falha ao aplicar ${file}: ${(err as Error).message}`);
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

export default runMigrations;

// Permite execução direta: tsx src/config/migrations.ts
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      logger.info('Migrations: concluído.');
      process.exit(0);
    })
    .catch(() => process.exit(1));
}
