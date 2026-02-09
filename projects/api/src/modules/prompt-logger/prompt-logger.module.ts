import { Module } from '@nestjs/common';
import { PromptLoggerService } from './prompt-logger.service';

@Module({
  providers: [PromptLoggerService],
  exports: [PromptLoggerService],
})
export class PromptLoggerModule {}
