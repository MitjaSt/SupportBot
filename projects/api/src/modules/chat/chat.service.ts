import { Injectable } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import {
  SessionRepository,
  type Session,
  type Message,
  type CollectionState,
} from '../database/session.repository';
import { RagService, RagResponse, ResponseMetadata, StreamEvent } from '../rag/rag.service';
import { PromptGuardService } from '../prompt-guard/prompt-guard.service';
import { SuggestionsService } from './suggestions.service';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';

function hasDebugAccess(user: AuthUser | null): boolean {
  return user?.permissions.includes('system:read') ?? false;
}

export type ChatStreamEvent = (StreamEvent | { type: 'suggestions'; suggestions: string[] }) & { sessionId: string };

export interface ChatResponse extends RagResponse {
  sessionId: string;
  collectionState: CollectionState;
}

@Injectable()
export class ChatService {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly rag: RagService,
    private readonly config: ConfigService,
    private readonly promptGuard: PromptGuardService,
    private readonly suggestions: SuggestionsService,
  ) {}

  async chat(sessionId: string, message: string, user: AuthUser | null = null): Promise<ChatResponse> {
    // Scan for prompt injection / jailbreak before any processing
    await this.promptGuard.scan(message);

    // Get or create session — stamp userId so authenticated users own their sessions
    const session = await this.sessions.getOrCreateSession(sessionId, user?.sub ?? undefined);

    // Get conversation history
    const history = await this.sessions.getMessages(sessionId);

    // Add user message to history
    await this.sessions.addMessage(sessionId, 'user', message);

    // Convert to RAG format, capped to the configured context window
    const conversationHistory = history
      .slice(-this.config.rag.contextHistoryMessages)
      .map((m) => ({ role: m.role, content: m.content }));

    // Get RAG response (pass sessionId for observability tracing)
    const response = await this.rag.query(message, conversationHistory, sessionId);

    // Add assistant response to history
    await this.sessions.addMessage(sessionId, 'assistant', response.answer, response.sources, response.fullPrompt, response.promptTokenCount);

    return {
      ...response,
      sources: hasDebugAccess(user) ? response.sources : [],
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

  async listSessionsForUser(userId: string, limit = 50) {
    return this.sessions.listSessionsForUser(userId, limit);
  }

  async getSessionForUser(sessionId: string, userId: string) {
    return this.sessions.getSessionForUser(sessionId, userId);
  }

  async listConsentedSessions(limit = 50) {
    return this.sessions.listConsentedSessions(limit);
  }

  /**
   * Streaming version of chat() that yields events as they're generated
   */
  async *chatStream(
    sessionId: string,
    message: string,
    user: AuthUser | null = null,
  ): AsyncGenerator<ChatStreamEvent> {
    // Scan for prompt injection / jailbreak before any processing
    await this.promptGuard.scan(message);

    // Get or create session — stamp userId so authenticated users own their sessions
    const session = await this.sessions.getOrCreateSession(sessionId, user?.sub ?? undefined);

    // Get conversation history
    const history = await this.sessions.getMessages(sessionId);

    // Add user message to history
    await this.sessions.addMessage(sessionId, 'user', message);

    // Convert to RAG format, capped to the configured context window
    const conversationHistory = history
      .slice(-this.config.rag.contextHistoryMessages)
      .map((m) => ({ role: m.role, content: m.content }));

    // Stream RAG response
    let fullAnswer = '';
    let chunks: object[] | undefined;
    let fullPrompt: string | undefined;
    let promptTokenCount: number | undefined;
    for await (const event of this.rag.queryStream(message, conversationHistory, sessionId)) {
      // Collect full answer for storage
      if (event.type === 'chunk' && event.content) {
        fullAnswer += event.content;
      } else if (event.type === 'tool' && event.content) {
        fullAnswer = event.content;
      } else if (event.type === 'done' && event.metadata) {
        chunks = event.metadata.sources;
        fullPrompt = event.metadata.fullPrompt;
        promptTokenCount = event.metadata.promptTokenCount;
      }

      // Yield event to client with sessionId; strip sources from done events for non-admins
      if (event.type === 'done' && event.metadata && !hasDebugAccess(user)) {
        const { sources: _sources, ...metaWithoutSources } = event.metadata;
        yield { ...event, metadata: metaWithoutSources as ResponseMetadata, sessionId: session.sessionId };
      } else {
        yield { ...event, sessionId: session.sessionId };
      }
    }

    // Add assistant response to history after streaming completes
    await this.sessions.addMessage(sessionId, 'assistant', fullAnswer, chunks, fullPrompt, promptTokenCount);

    // Generate and stream follow-up suggestions (empty array when disabled)
    const suggestionList = await this.suggestions.generate(message, fullAnswer);
    yield { type: 'suggestions', suggestions: suggestionList, sessionId: session.sessionId };
  }
}
