import { neon, Pool } from '@neondatabase/serverless'

type NeonSql = ReturnType<typeof neon>
type SqlTemplate = (strings: TemplateStringsArray, ...values: any[]) => Promise<Record<string, any>[]>

let _sql: NeonSql | null = null

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return databaseUrl
}

function getSql(): NeonSql {
  if (!_sql) {
    _sql = neon(getDatabaseUrl())
  }
  return _sql
}

export const sql: SqlTemplate = (strings: TemplateStringsArray, ...values: any[]) => {
  return getSql()(strings, ...values) as Promise<Record<string, any>[]>
}

// Shared WebSocket-backed pool for operations that need a persistent session
// across multiple queries (e.g. session-scoped advisory locks held while
// async work runs between statements). The http `sql` client above creates a
// fresh connection per call and cannot hold session state.
let _pool: Pool | null = null
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: getDatabaseUrl() })
  }
  return _pool
}
