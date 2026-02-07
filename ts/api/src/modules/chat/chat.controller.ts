import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from './chat.service';
import type { QueryRequest, QueryResponse } from '@/dto/query.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('query')
  async query(@Body() body: QueryRequest): Promise<QueryResponse> {
    const sessionId = body.sessionId ?? uuidv4();
    return this.chat.chat(sessionId, body.query);
  }

  @Get('sessions')
  async listSessions(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.chat.listSessions(parsedLimit);
  }

  @Get('sessions/:sessionId')
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.chat.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const history = await this.chat.getHistory(sessionId);
    return { session, history };
  }

  @Delete('sessions/:sessionId')
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.chat.clearSession(sessionId);
    return { success: true };
  }
}
