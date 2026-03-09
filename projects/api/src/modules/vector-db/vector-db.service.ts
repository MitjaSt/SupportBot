import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { vectors } from '@/db';
import { sql } from 'drizzle-orm';

export interface VectorPoint {
  id?: string;
  vector: number[];
  payload: {
    text: string;
    source: string;
    chunk_index: number;
    chunk_length?: number;
    title?: string;
    url?: string;
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

interface SearchQueryRow {
  id: unknown;
  text: unknown;
  source: unknown;
  chunkIndex: unknown;
  score: unknown;
}

interface CountQueryRow {
  count: unknown;
}

@Injectable()
export class VectorDbService implements OnModuleInit {
  private readonly logger = new Logger(VectorDbService.name);

  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureExtension();
    await this.checkVectorCount();
  }

  private async checkVectorCount(): Promise<void> {
    try {
      const result = await this.db.execute(sql`SELECT COUNT(*) as count FROM ${vectors}`);
      const count = Number((result.rows as unknown as CountQueryRow[])[0]?.count ?? 0);
      if (count === 0) {
        this.logger.warn(
          'Vector DB is empty — RAG will return no results until content is ingested. ' +
            'Run the pipeline to populate the knowledge base.',
        );
      } else {
        this.logger.log(`Vector DB ready: ${count} chunks indexed`);
      }
    } catch (error) {
      this.logger.warn('Could not check vector count at startup:', error);
    }
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
          title: p.payload.title,
          url: p.payload.url,
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
      const mapped = (results.rows as unknown as SearchQueryRow[]).map((r) => ({
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

  async hybridSearch(
    queryVector: number[],
    queryText: string,
    limit: number,
  ): Promise<SearchResult[]> {
    try {
      // Reciprocal Rank Fusion: combines vector similarity and BM25 keyword ranking.
      // k=60 is the standard RRF constant. FULL OUTER JOIN ensures results from either
      // side are included even when the other search returns no match.
      const query = sql`
        WITH vector_ranked AS (
          SELECT id, text, source, chunk_index,
            ROW_NUMBER() OVER (ORDER BY embedding <=> ${JSON.stringify(queryVector)}::vector) AS rank
          FROM vectors
          LIMIT ${limit * 4}
        ),
        text_ranked AS (
          SELECT id, text, source, chunk_index,
            ROW_NUMBER() OVER (ORDER BY ts_rank(search_text, query) DESC) AS rank
          FROM vectors, websearch_to_tsquery('english', ${queryText}) AS query
          WHERE search_text @@ query
          LIMIT ${limit * 4}
        ),
        rrf AS (
          SELECT
            COALESCE(v.id, t.id)                    AS id,
            COALESCE(v.text, t.text)                AS text,
            COALESCE(v.source, t.source)            AS source,
            COALESCE(v.chunk_index, t.chunk_index)  AS "chunkIndex",
            COALESCE(1.0 / (60 + v.rank), 0.0)
              + COALESCE(1.0 / (60 + t.rank), 0.0) AS score
          FROM vector_ranked v
          FULL OUTER JOIN text_ranked t ON v.id = t.id
        )
        SELECT id, text, source, "chunkIndex", score
        FROM rrf
        ORDER BY score DESC
        LIMIT ${limit}
      `;

      const results = await this.db.execute(query);

      return (results.rows as unknown as SearchQueryRow[]).map((r) => ({
        id: String(r.id),
        score: Number(r.score),
        text: String(r.text),
        source: String(r.source),
        chunkIndex: Number(r.chunkIndex),
      }));
    } catch (error) {
      this.logger.error('Failed to run hybrid search:', error);
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

      const count = Number((result.rows as unknown as CountQueryRow[])[0]?.count ?? 0);

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
