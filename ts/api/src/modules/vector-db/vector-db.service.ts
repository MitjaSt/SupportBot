import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@/config/config.service';

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
  private readonly client: QdrantClient;
  private readonly collectionName: string;
  private readonly vectorSize: number;

  constructor(private readonly config: ConfigService) {
    // Use url parameter for full URL (http://localhost:6333)
    this.client = new QdrantClient({
      url: `http://${config.qdrant.host}:${config.qdrant.port}`,
    });
    this.collectionName = config.qdrant.collectionName;
    this.vectorSize = config.embedding.vectorSize;
  }

  async onModuleInit(): Promise<void> {
    await this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const exists = await this.client.collectionExists(this.collectionName);
      if (!exists.exists) {
        await this.createCollection();
      }
      console.log(`Qdrant collection '${this.collectionName}' ready`);
    } catch (error) {
      console.error('Failed to initialize Qdrant collection:', error);
      throw error;
    }
  }

  async createCollection(): Promise<void> {
    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: this.vectorSize,
        distance: 'Cosine',
      },
    });
    console.log(`Created Qdrant collection: ${this.collectionName}`);
  }

  async recreateCollection(): Promise<void> {
    const exists = await this.client.collectionExists(this.collectionName);
    if (exists.exists) {
      await this.client.deleteCollection(this.collectionName);
      console.log(`Deleted existing collection: ${this.collectionName}`);
    }
    await this.createCollection();
  }

  async upsertPoints(points: VectorPoint[]): Promise<void> {
    const qdrantPoints = points.map((p) => ({
      id: p.id ?? uuidv4(),
      vector: p.vector,
      payload: p.payload,
    }));

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < qdrantPoints.length; i += batchSize) {
      const batch = qdrantPoints.slice(i, i + batchSize);
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: batch,
      });
    }
  }

  async search(
    queryVector: number[],
    limit: number,
    scoreThreshold?: number,
  ): Promise<SearchResult[]> {
    const results = await this.client.search(this.collectionName, {
      vector: queryVector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });

    return results.map((r) => ({
      id: String(r.id),
      score: r.score,
      text: (r.payload?.text as string) ?? '',
      source: (r.payload?.source as string) ?? '',
      chunkIndex: (r.payload?.chunk_index as number) ?? 0,
    }));
  }

  async getCollectionInfo(): Promise<{
    pointsCount: number;
    vectorsCount: number;
  }> {
    const info = await this.client.getCollection(this.collectionName);
    return {
      pointsCount: info.points_count ?? 0,
      vectorsCount: info.indexed_vectors_count ?? 0,
    };
  }

  async deleteAllPoints(): Promise<void> {
    await this.client.delete(this.collectionName, {
      filter: {
        must: [],
      },
    });
  }
}
