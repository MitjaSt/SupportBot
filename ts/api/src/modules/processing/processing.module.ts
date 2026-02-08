import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { ProcessingService } from './processing.service';
import { SummarizationService } from './summarization.service';

@Module({
  imports: [ConfigModule],
  providers: [ProcessingService, SummarizationService],
  exports: [ProcessingService, SummarizationService],
})
export class ProcessingModule {}
