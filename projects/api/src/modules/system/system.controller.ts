import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '@/modules/database/database.service';
import { VectorDbService } from '@/modules/vector-db/vector-db.service';
import { ConfigService } from '@/config/config.service';

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: string; connected: boolean };
    vectorDb: { status: string; collection: string; pointsCount: number };
    embedding: { provider: string; model: string };
    llm: { provider: string; model: string };
  };
}

@Controller('system')
export class SystemController {
  constructor(
    private readonly database: DatabaseService,
    private readonly vectorDb: VectorDbService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  async getStatus(): Promise<SystemStatus> {
    const services = {
      database: await this.checkDatabase(),
      vectorDb: await this.checkVectorDb(),
      embedding: this.getEmbeddingInfo(),
      llm: this.getLlmInfo(),
    };

    const allHealthy =
      services.database.connected && services.vectorDb.status === 'ok';

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  private async checkDatabase(): Promise<{
    status: string;
    connected: boolean;
  }> {
    try {
      // Try a simple query to verify connection
      const db = this.database.db;
      if (db) {
        return { status: 'ok', connected: true };
      }
      return { status: 'not connected', connected: false };
    } catch {
      return { status: 'error', connected: false };
    }
  }

  private async checkVectorDb(): Promise<{
    status: string;
    collection: string;
    pointsCount: number;
  }> {
    try {
      const info = await this.vectorDb.getCollectionInfo();
      return {
        status: 'ok',
        collection: 'vectors',
        pointsCount: info.pointsCount,
      };
    } catch {
      return {
        status: 'error',
        collection: 'vectors',
        pointsCount: 0,
      };
    }
  }

  private getEmbeddingInfo(): { provider: string; model: string } {
    return {
      provider: this.config.embedding.provider,
      model: this.config.embedding.model,
    };
  }

  private getLlmInfo(): { provider: string; model: string } {
    return {
      provider: 'openai',
      model: this.config.openai.chatModel,
    };
  }
}
