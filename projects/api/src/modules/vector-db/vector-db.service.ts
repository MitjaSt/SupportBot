import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import { createDb, vectors, type Database } from '@/db';
import { sql } from 'drizzle-orm';

export interface VectorPoint {
  id?: string;
  vector: number[];
  payload: {
    text: string;
    source: string;
    chunk_index: number;
    chunk_length?: number;
    [key: string]: unknown;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  source: string;
  chunkIndex: number;
}

@Injectable()
export class VectorDbService implements OnModuleInit {
  private readonly logger = new Logger(VectorDbService.name);
  private readonly db: Database;

  constructor(private readonly config: ConfigService) {
    this.db = createDb({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureExtension();
  }

  private async ensureExtension(): Promise<void> {
    try {
      // Enable pgvector extension
      await this.db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
      this.logger.log('pgvector extension enabled');
    } catch (error) {
      this.logger.error('Failed to enable pgvector extension:', error);
      throw error;
    }
  }

  async recreateCollection(): Promise<void> {
    try {
      // Delete all vectors
      await this.db.delete(vectors);
      this.logger.log('Cleared all vectors from table');
    } catch (error) {
      this.logger.error('Failed to recreate collection:', error);
      throw error;
    }
  }

  async upsertPoints(points: VectorPoint[]): Promise<void> {
    try {
      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);

        const values = batch.map((p) => ({
          embedding: p.vector,
          text: p.payload.text,
          source: p.payload.source,
          chunkIndex: p.payload.chunk_index,
          chunkLength: p.payload.chunk_length ?? p.payload.text.length,
        }));

        await this.db.insert(vectors).values(values);
        this.logger.log(`Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }

      this.logger.log(`Successfully upserted ${points.length} vectors`);
    } catch (error) {
      this.logger.error('Failed to upsert points:', error);
      throw error;
    }
  }

  async search(
    queryVector: number[],
    limit: number,
    scoreThreshold?: number,
  ): Promise<SearchResult[]> {
    try {
      // pgvector cosine distance: 1 - cosine_similarity
      // Lower distance = higher similarity
      // Convert to similarity score (0-1 range, higher is better)
      const query = sql`
        SELECT
          id,
          text,
          source,
          chunk_index as "chunkIndex",
          1 - (embedding <=> ${JSON.stringify(queryVector)}::vector) as score
        FROM ${vectors}
        ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector
        LIMIT ${limit}
      `;

      const results = await this.db.execute(query);

      // Map and filter by score threshold if provided
      const mapped = results.rows.map((r: any) => ({
        id: String(r.id),
        score: Number(r.score),
        text: String(r.text),
        source: String(r.source),
        chunkIndex: Number(r.chunkIndex),
      }));

      if (scoreThreshold !== undefined) {
        return mapped.filter((r) => r.score >= scoreThreshold);
      }

      return mapped;
    } catch (error) {
      this.logger.error('Failed to search vectors:', error);
      throw error;
    }
  }

  async getCollectionInfo(): Promise<{
    pointsCount: number;
    vectorsCount: number;
  }> {
    try {
      const result = await this.db.execute(sql`
        SELECT COUNT(*) as count FROM ${vectors}
      `);

      const count = Number(result.rows[0]?.count ?? 0);

      return {
        pointsCount: count,
        vectorsCount: count,
      };
    } catch (error) {
      this.logger.error('Failed to get collection info:', error);
      throw error;
    }
  }

  async deleteAllPoints(): Promise<void> {
    try {
      await this.db.delete(vectors);
      this.logger.log('Deleted all vectors');
    } catch (error) {
      this.logger.error('Failed to delete all points:', error);
      throw error;
    }
  }

  // Keep this method for backwards compatibility but it's now a no-op
  async createCollection(): Promise<void> {
    this.logger.log('Collection creation not needed with Postgres (table exists via migrations)');
  }
}
