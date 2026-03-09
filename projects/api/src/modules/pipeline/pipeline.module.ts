import { ConfigModule } from '@/config/config.module';
import { EmbeddingsModule } from '@/modules/embeddings/embeddings.module';
import { MetricsModule } from '@/modules/metrics/metrics.module';
import { ProcessingModule } from '@/modules/processing/processing.module';
import { VectorDbModule } from '@/modules/vector-db/vector-db.module';
import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';

@Module({
  imports: [
    ConfigModule,
    ProcessingModule,
    EmbeddingsModule,
    VectorDbModule,
    MetricsModule
  ],
  controllers: [PipelineController],
})
export class PipelineModule {}
