import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export * from './schema';

let pool: Pool | null = null;

export function createDb(connectionConfig: {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}) {
  pool = new Pool({
    ...connectionConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return drizzle(pool, { schema });
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export type Database = ReturnType<typeof createDb>;
