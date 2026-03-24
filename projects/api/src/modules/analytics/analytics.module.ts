import { MetricsModule } from '@/modules/metrics/metrics.module';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { ProcessingModule } from '../processing/processing.module';
import { VectorDbModule } from '../vector-db/vector-db.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ConversationsController } from './conversations.controller';

@Module({
  imports: [DatabaseModule, EmbeddingsModule, VectorDbModule, ProcessingModule, MetricsModule],
  controllers: [AnalyticsController, ConversationsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
