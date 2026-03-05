import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../.env'), override: true });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'macular',
    password: process.env.POSTGRES_PASSWORD || 'macular_dev',
    database: process.env.POSTGRES_DATABASE || 'macular_society',
    ssl: false,
  },
});
