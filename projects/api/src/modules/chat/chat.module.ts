import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { MetricsModule } from '../metrics/metrics.module';
import { PiperModule } from '../piper/piper.module';
import { PromptGuardModule } from '../prompt-guard/prompt-guard.module';
import { RagModule } from '../rag/rag.module';
import { WhisperModule } from '../whisper/whisper.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SuggestionsService } from './suggestions.service';

@Module({
  imports: [DatabaseModule, RagModule, MetricsModule, WhisperModule, PiperModule, PromptGuardModule],
  controllers: [ChatController],
  providers: [ChatService, SuggestionsService],
  exports: [ChatService],
})
export class ChatModule {}
