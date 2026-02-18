import { Injectable } from '@nestjs/common';
import {
  SessionRepository,
  type Session,
  type Message,
  type CollectionState,
} from '../database/session.repository';
import { RagService, RagResponse, StreamEvent } from '../rag/rag.service';

export interface ChatResponse extends RagResponse {
  sessionId: string;
  collectionState: CollectionState;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly rag: RagService,
  ) {}

  async chat(sessionId: string, message: string): Promise<ChatResponse> {
    // Get or create session
    const session = await this.sessions.getOrCreateSession(sessionId);

    // Get conversation history
    const history = await this.sessions.getMessages(sessionId);

    // Add user message to history
    await this.sessions.addMessage(sessionId, 'user', message);

    // Convert to RAG format
    const conversationHistory = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Get RAG response (pass sessionId for observability tracing)
    const response = await this.rag.query(message, conversationHistory, sessionId);

    // Add assistant response to history
    await this.sessions.addMessage(sessionId, 'assistant', response.answer, response.sources, response.fullPrompt);

    return {
      ...response,
      sessionId: session.sessionId,
      collectionState: session.collectionState ?? 'idle',
    };
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.getSession(sessionId);
  }

  async getHistory(sessionId: string): Promise<Message[]> {
    return this.sessions.getMessages(sessionId);
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.sessions.deleteSession(sessionId);
  }

  async listSessions(limit = 50) {
    return this.sessions.listSessions(limit);
  }

  /**
   * Streaming version of chat() that yields events as they're generated
   */
  async *chatStream(
    sessionId: string,
    message: string,
  ): AsyncGenerator<StreamEvent & { sessionId: string }> {
    // Get or create session
    const session = await this.sessions.getOrCreateSession(sessionId);

    // Get conversation history
    const history = await this.sessions.getMessages(sessionId);

    // Add user message to history
    await this.sessions.addMessage(sessionId, 'user', message);

    // Convert to RAG format
    const conversationHistory = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Stream RAG response
    let fullAnswer = '';
    let chunks: object[] | undefined;
    let fullPrompt: string | undefined;
    for await (const event of this.rag.queryStream(message, conversationHistory, sessionId)) {
      // Collect full answer for storage
      if (event.type === 'chunk' && event.content) {
        fullAnswer += event.content;
      } else if (event.type === 'tool' && event.content) {
        fullAnswer = event.content;
      } else if (event.type === 'done' && event.metadata) {
        chunks = event.metadata.sources;
        fullPrompt = event.metadata.fullPrompt;
      }

      // Yield event to client with sessionId
      yield { ...event, sessionId: session.sessionId };
    }

    // Add assistant response to history after streaming completes
    await this.sessions.addMessage(sessionId, 'assistant', fullAnswer, chunks, fullPrompt);
  }
}
