import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './modules/database/database.module';
import { EmbeddingsModule } from './modules/embeddings/embeddings.module';
import { VectorDbModule } from './modules/vector-db/vector-db.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { RagModule } from './modules/rag/rag.module';
import { ChatModule } from './modules/chat/chat.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { SystemModule } from './modules/system/system.module';

@Module({
  imports: [
    ConfigModule,
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
