import pg from 'pg';

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_LOG_URL;

const supabasePool = supabaseUrl
  ? new Pool({
      connectionString: supabaseUrl,
      max: 3,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    })
  : null;

if (supabasePool !== null) {
  supabasePool.on('error', (err: Error) => {
    console.error('[SupabasePool] Cliente ocioso com erro (ignorado):', err.message);
  });
}

export default supabasePool;

export async function closeSupabasePool(): Promise<void> {
  if (supabasePool) {
    await supabasePool.end();
  }
}
