import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectorDbModule } from '../vector-db/vector-db.module';
import { RagService } from './rag.service';

@Module({
  imports: [EmbeddingsModule, VectorDbModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
