import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RagModule } from '../rag/rag.module';
import { WhisperModule } from '../whisper/whisper.module';
import { PiperModule } from '../piper/piper.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [DatabaseModule, RagModule, WhisperModule, PiperModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
