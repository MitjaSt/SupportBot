import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { VectorDbModule } from '../vector-db/vector-db.module';
import { PromptLoggerModule } from '../prompt-logger/prompt-logger.module';
import { ObservabilityModule } from '../observability/observability.module';
import { ContactCollectionModule } from '../contact-collection/contact-collection.module';
import { DatabaseModule } from '../database/database.module';
import { MetricsModule } from '../metrics/metrics.module';
import { RagService } from './rag.service';
import { ToolHandlerService } from './services/tool-handler.service';
import { ContactCollectionToolHandler } from './handlers/contact-collection.handler';
import { IToolHandler } from './interfaces/tool-handler.interface';

@Module({
  imports: [
    EmbeddingsModule,
    VectorDbModule,
    PromptLoggerModule,
    ObservabilityModule,
    ContactCollectionModule,
    DatabaseModule,
    MetricsModule,
  ],
  providers: [
    // Tool handlers
    ContactCollectionToolHandler,
    // Tool handler service with all handlers injected
    {
      provide: ToolHandlerService,
      useFactory: (...handlers: IToolHandler[]) => {
        return new ToolHandlerService(handlers);
      },
      inject: [ContactCollectionToolHandler],
    },
    RagService,
  ],
  exports: [RagService],
})
export class RagModule {}
