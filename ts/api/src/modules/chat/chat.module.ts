import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RagModule } from '../rag/rag.module';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

@Module({
  imports: [DatabaseModule, RagModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
