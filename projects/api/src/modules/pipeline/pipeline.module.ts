import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';
import { ProcessingModule } from '@/modules/processing/processing.module';
import { EmbeddingsModule } from '@/modules/embeddings/embeddings.module';
import { VectorDbModule } from '@/modules/vector-db/vector-db.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    ConfigModule,
    ProcessingModule,
    EmbeddingsModule,
    VectorDbModule,
  ],
  controllers: [PipelineController],
})
export class PipelineModule {}
