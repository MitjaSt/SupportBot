import type { QueryRequest, QueryResponse } from '@/dto/query.dto';
import { QueryRequestSchema } from '@/dto/query.dto';
import { Type } from '@sinclair/typebox';
import { TypeBoxPipe } from '@/pipes/typebox-validation.pipe';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
import { OptionalAuth } from '@/modules/auth/decorators/optional-auth.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthUser } from '@/modules/auth/interfaces/auth-user.interface';
import { ChatService } from './chat.service';
import { WhisperService } from '../whisper/whisper.service';
import { PiperService } from '../piper/piper.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly whisper: WhisperService,
    private readonly piper: PiperService,
  ) {}

  @OptionalAuth()
  @Post('query')
  async query(
    @Body(TypeBoxPipe(QueryRequestSchema)) body: QueryRequest,
    @CurrentUser() user: AuthUser | null,
  ): Promise<QueryResponse> {
    return this.chat.chat(body.sessionId, body.query, user);
  }

  @OptionalAuth()
  @Post('query/stream')
  async queryStream(
    @Body(TypeBoxPipe(QueryRequestSchema)) body: QueryRequest,
    @CurrentUser() user: AuthUser | null,
    @Res() reply: FastifyReply,
  ) {
    const sessionId = body.sessionId;

    // Set SSE headers for Fastify
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      // Stream events to client
      for await (const event of this.chat.chatStream(sessionId, body.query, user)) {
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

  @Post('query/voice')
  async voiceQuery(
    @Req() request: FastifyRequest,
    @Query('sessionId', TypeBoxPipe(Type.String({ minLength: 1 }))) sessionId: string,
  ): Promise<QueryResponse & { transcription?: { text: string; language: string } }> {
    // Audio is sent as a raw binary body (Content-Type: audio/webm etc.)
    // with sessionId as a query parameter — avoids @fastify/multipart entirely.
    const audioBuffer = request.body as Buffer;

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadRequestException('No audio data provided');
    }

    // Derive a filename that Whisper can use to detect the format.
    const contentType = (request.headers['content-type'] ?? 'audio/webm').split(';')[0].trim();
    const extMap: Record<string, string> = {
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
    };
    const ext = extMap[contentType] ?? 'webm';
    const filename = `recording.${ext}`;

    // Transcribe audio to text using Whisper
    const transcription = await this.whisper.transcribe(audioBuffer, filename);

    // Process the query using existing chat logic
    const response = await this.chat.chat(sessionId, transcription.text);

    return {
      ...response,
      transcription: {
        text: transcription.text,
        language: transcription.language,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(
    @CurrentUser() user: AuthUser | null,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.chat.listSessionsForUser(user!.sub, parsedLimit);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sessions.consented:read')
  @Get('consented-sessions')
  async listConsentedSessions(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.chat.listConsentedSessions(parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:sessionId')
  async getSession(
    @CurrentUser() user: AuthUser | null,
    @Param('sessionId') sessionId: string,
  ) {
    const session = await this.chat.getSessionForUser(sessionId, user!.sub);
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

  @Post('synthesize')
  async synthesize(@Body('text') text: string, @Res() reply: FastifyReply) {
    if (!text) {
      throw new BadRequestException('No text provided');
    }

    // Synthesize text to speech using Piper
    const audioBuffer = await this.piper.synthesize(text);

    // Send audio as WAV file
    reply.header('Content-Type', 'audio/wav');
    reply.header('Content-Length', audioBuffer.length.toString());
    reply.send(audioBuffer);
  }
}
