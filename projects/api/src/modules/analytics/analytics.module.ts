import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ProcessingModule } from '../processing/processing.module';
import { VectorDbModule } from '../vector-db/vector-db.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [DatabaseModule, EmbeddingsModule, VectorDbModule, ProcessingModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
