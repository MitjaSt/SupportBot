import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectorDbModule } from '../vector-db/vector-db.module';
import { PromptLoggerModule } from '../prompt-logger/prompt-logger.module';
import { RagService } from './rag.service';

@Module({
  imports: [EmbeddingsModule, VectorDbModule, PromptLoggerModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
