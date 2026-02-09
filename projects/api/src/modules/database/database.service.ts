import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@/config/config.service';
import * as schema from '@/db/schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
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

    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
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
