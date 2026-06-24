import { Pool, type QueryResultRow } from 'pg'

/**
 * Single source of truth for the PostgreSQL connection.
 *
 * The whole app talks to Postgres through the standard `pg` driver using the
 * `DATABASE_URL` environment variable, so it stays 100% portable to any VPS:
 * point DATABASE_URL at your own Postgres and run the migrations in scripts/.
 *
 * There is no in-memory fallback: the panel requires a real database. If
 * DATABASE_URL is missing the app fails fast with a clear, actionable error.
 */

// Reuse the pool across hot reloads in development / across route handlers.
const globalForDb = globalThis as unknown as { __pgPool?: Pool }

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Configure it in your environment ' +
        '(see .env.example) and run scripts/001_schema.sql + 003_engine.sql + 004_realtime.sql.',
    )
  }
  const pool = new Pool({
    connectionString,
    // Enable TLS for managed Postgres providers that require it; harmless for a
    // local VPS where sslmode can be disabled in the connection string.
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
  })
  pool.on('error', (err) => {
    console.error('[db] Unexpected PostgreSQL pool error:', err.message)
  })
  return pool
}

export function getPool(): Pool {
  if (!globalForDb.__pgPool) {
    globalForDb.__pgPool = createPool()
  }
  return globalForDb.__pgPool
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  try {
    const result = await getPool().query<T>(text, params as never)
    return result.rows
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[db] Query failed:', message)
    throw new Error(`Database error: ${message}`)
  }
}

export async function checkDbConnection(): Promise<{
  ok: boolean
  message: string
}> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      message: 'DATABASE_URL is not configured.',
    }
  }
  try {
    await query('SELECT 1')
    return { ok: true, message: 'Connected to PostgreSQL.' }
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error ? err.message : 'Failed to connect to PostgreSQL.',
    }
  }
}
