import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env.config') });
config({ path: resolve(__dirname, '../../../.env.secrets'), override: true });

async function main() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'rag_user',
    password: process.env.POSTGRES_PASSWORD || 'rag_user_password',
    database: process.env.POSTGRES_DATABASE || 'rag_project',
  });

  const db = drizzle(pool);

  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: resolve(__dirname, '../drizzle') });
  console.log('Migrations complete.');

  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
