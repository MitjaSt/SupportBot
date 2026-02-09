import { Injectable } from '@nestjs/common';
import {
  SessionRepository,
  type Session,
  type Message,
  type CollectionState,
} from '../database/session.repository';
import { RagService, RagResponse } from '../rag/rag.service';

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
    await this.sessions.addMessage(sessionId, 'assistant', response.answer);

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
}
