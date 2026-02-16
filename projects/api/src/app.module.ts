import { join } from 'path';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from './config/config.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { DatabaseModule } from './modules/database/database.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { VectorDbModule } from './modules/vector-db/vector-db.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { SystemModule } from './modules/system/system.module';
import { MetricsModule } from './modules/metrics/metrics.module';

@Module({
  imports: [
    // Serve the Vite-built frontend. The public/ dir is populated by the Docker build.
    // In local dev this folder won't exist, which is fine — NestJS skips it gracefully.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
    }),
    ConfigModule,
    MetricsModule,
    ObservabilityModule,
    DatabaseModule,
    EmbeddingsModule,
    VectorDbModule,
    ScrapingModule,
    ProcessingModule,
    RagModule,
    ChatModule,
    PipelineModule,
    SystemModule,
  ],
})
export class AppModule {}
