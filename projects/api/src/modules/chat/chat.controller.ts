import type { QueryRequest, QueryResponse } from '@/dto/query.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('query')
  async query(@Body() body: QueryRequest): Promise<QueryResponse> {
    const sessionId = body.sessionId ?? uuidv4();
    return this.chat.chat(sessionId, body.query);
  }

  @Post('query/stream')
  async queryStream(@Body() body: QueryRequest, @Res() reply: FastifyReply) {
    const sessionId = body.sessionId ?? uuidv4();

    // Set SSE headers for Fastify
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      // Stream events to client
      for await (const event of this.chat.chatStream(sessionId, body.query)) {
        // Send event as SSE format: "data: {json}\n\n"
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Close the stream
      reply.raw.end();
    } catch (error) {
      // Send error event
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.raw.write(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`);
      reply.raw.end();
    }
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
