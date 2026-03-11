import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { getTableColumns, getTableName, is, Table } from 'drizzle-orm';
import { type AnyPgTable } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@/config/config.service';
import * as schema from '@/db/schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private _db: DrizzleDb | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  get db(): DrizzleDb {
    if (!this._db) {
      throw new Error('Database not connected');
    }
    return this._db;
  }

  private async connect(): Promise<void> {
    const { host, port, database, user, password } = this.config.postgres;

    this.pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this._db = drizzle(this.pool, { schema });

    // Without this listener, any idle connection dropped by Postgres (e.g. server
    // restart, admin kill) emits an 'error' event that Node throws as an
    // uncaughtException and crashes the process.
    this.pool.on('error', (err) => {
      this.logger.error('PostgreSQL pool error', err.stack);
      Sentry.captureException(err);
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }

    await this.checkSchema();
  }

  private async checkSchema(): Promise<void> {
    const tables = Object.values(schema).filter((v) => is(v, Table)) as AnyPgTable[];

    for (const table of tables) {
      const tableName = getTableName(table);
      const expectedColumns = Object.values(getTableColumns(table)).map((col) => col.name);

      const result = await this.pool!.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
        [tableName],
      );

      if (result.rows.length === 0) {
        this.logger.warn(`Table "${tableName}" does not exist. Run "make db-push" to apply migrations.`);
        continue;
      }

      const actualColumns = result.rows.map((r) => r.column_name);
      const missing = expectedColumns.filter((col) => !actualColumns.includes(col));

      if (missing.length > 0) {
        this.logger.warn(
          `Schema mismatch on table "${tableName}": missing columns [${missing.join(', ')}]. Run "make db-push" to apply.`,
        );
      }
    }
  }

  private async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this._db = null;
      console.log('PostgreSQL connection closed');
    }
  }
}
