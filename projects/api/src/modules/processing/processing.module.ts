import { ConfigModule } from '@/config/config.module';
import { Module } from '@nestjs/common';
import { CriteriaGenerationService } from './criteria-generation.service';
import { ProcessingService } from './processing.service';
import { SummarizationService } from './summarization.service';

@Module({
  imports: [ConfigModule],
  providers: [ProcessingService, SummarizationService, CriteriaGenerationService],
  exports: [ProcessingService, SummarizationService, CriteriaGenerationService],
})
export class ProcessingModule {}
