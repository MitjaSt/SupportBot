import { ConfigService } from '@/config/config.service';
import {
  messages,
  sessions,
  type CollectionState,
  type Message,
  type Session,
} from '@/db/schema';
import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gt, sql } from 'drizzle-orm';
import { DatabaseService } from './database.service';

// Re-export types for consumers
export type { CollectionState, Message, Session } from '@/db/schema';

export interface SessionListItem {
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  collectionState: string | null;
  userName: string | null;
  userPhone: string | null;
  preferredCallTime: string | null;
  callbackTopic: string | null;
  messageCount: number;
  firstMessage: string | null;
}

@Injectable()
export class SessionRepository {
  private readonly expiryHours: number;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.expiryHours = config.postgres.sessionExpiryHours;
  }

  private get db() {
    return this.dbService.db;
  }

  private getExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.expiryHours);
    return expiresAt;
  }

  async createSession(sessionId: string, userId?: string): Promise<Session> {
    const [session] = await this.db
      .insert(sessions)
      .values({
        sessionId,
        expiresAt: this.getExpiresAt(),
        userId: userId ?? null,
      })
      .returning();

    return session;
  }

  async listSessionsForUser(
    userId: string,
    limit = 50,
  ): Promise<Array<Session & { messageCount: number }>> {
    const result = await this.db
      .select({
        session: sessions,
        messageCount: count(messages.id),
      })
      .from(sessions)
      .leftJoin(messages, eq(sessions.sessionId, messages.sessionId))
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
      .groupBy(sessions.sessionId)
      .orderBy(desc(sessions.updatedAt))
      .limit(limit);

    return result.map((row: { session: Session; messageCount: number }) => ({
      ...row.session,
      messageCount: row.messageCount,
    }));
  }

  async getSessionForUser(sessionId: string, userId: string): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.sessionId, sessionId), eq(sessions.userId, userId)))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  async getOrCreateSession(sessionId: string, userId?: string): Promise<Session> {
    const existing = await this.getSession(sessionId);
    if (existing) {
      return existing;
    }
    return this.createSession(sessionId, userId);
  }

  async updateSession(
    session: Partial<Session> & { sessionId: string },
  ): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        userPhone: session.userPhone,
        userName: session.userName,
        preferredCallTime: session.preferredCallTime,
        collectionState: session.collectionState,
        callbackTopic: session.callbackTopic,
        updatedAt: new Date(),
        expiresAt: this.getExpiresAt(),
      })
      .where(eq(sessions.sessionId, session.sessionId));

      console.warn({
        userPhone: session.userPhone,
        userName: session.userName,
        preferredCallTime: session.preferredCallTime,
        collectionState: session.collectionState,
        callbackTopic: session.callbackTopic,
        updatedAt: new Date(),
        expiresAt: this.getExpiresAt(),
      });
      
  }

  async updateCollectionState(
    sessionId: string,
    state: CollectionState,
  ): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        collectionState: state,
        updatedAt: new Date(),
      })
      .where(eq(sessions.sessionId, sessionId));
  }

  async updateUserInfo(
    sessionId: string,
    info: { phone?: string; name?: string; preferredCallTime?: string },
  ): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        userPhone: info.phone,
        userName: info.name,
        preferredCallTime: info.preferredCallTime,
        updatedAt: new Date(),
      })
      .where(eq(sessions.sessionId, sessionId));
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    chunks?: object[] | null,
    fullPrompt?: string | null,
    promptTokenCount?: number | null,
  ): Promise<void> {
    await this.db.insert(messages).values({
      sessionId,
      role,
      content,
      chunks: chunks ?? null,
      fullPrompt: fullPrompt ?? null,
      promptTokenCount: promptTokenCount ?? null,
    });
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt));
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.sessionId, sessionId));
  }

  async listSessions(
    limit = 50,
  ): Promise<Array<Session & { messageCount: number }>> {
    const result = await this.db
      .select({
        session: sessions,
        messageCount: count(messages.id),
      })
      .from(sessions)
      .leftJoin(messages, eq(sessions.sessionId, messages.sessionId))
      .where(gt(sessions.expiresAt, new Date()))
      .groupBy(sessions.sessionId)
      .orderBy(desc(sessions.updatedAt))
      .limit(limit);

    return result.map((row: { session: Session; messageCount: number }) => ({
      ...row.session,
      messageCount: row.messageCount,
    }));
  }

  async listConsentedSessions(
    limit = 50,
  ): Promise<Array<Session & { messageCount: number }>> {
    const result = await this.db
      .select({
        session: sessions,
        messageCount: count(messages.id),
      })
      .from(sessions)
      .leftJoin(messages, eq(sessions.sessionId, messages.sessionId))
      .where(eq(sessions.collectionState, 'complete'))
      .groupBy(sessions.sessionId)
      .orderBy(desc(sessions.updatedAt))
      .limit(limit);

    return result.map((row: { session: Session; messageCount: number }) => ({
      ...row.session,
      messageCount: row.messageCount,
    }));
  }

  async listAllSessions(params: {
    search?: string;
    state?: string;
    limit: number;
  }): Promise<SessionListItem[]> {
    const { search, state, limit } = params;
    const cappedLimit = Math.min(limit, 500);

    const rows = await this.db.execute<{
      session_id: string;
      created_at: Date;
      updated_at: Date;
      collection_state: string | null;
      user_name: string | null;
      user_phone: string | null;
      preferred_call_time: string | null;
      callback_topic: string | null;
      message_count: string;
      first_message: string | null;
    }>(sql`
      SELECT
        s.session_id,
        s.created_at,
        s.updated_at,
        s.collection_state,
        s.user_name,
        s.user_phone,
        s.preferred_call_time,
        s.callback_topic,
        COUNT(m.id)::int AS message_count,
        (
          SELECT LEFT(content, 80)
          FROM messages
          WHERE session_id = s.session_id AND role = 'user'
          ORDER BY created_at ASC
          LIMIT 1
        ) AS first_message
      FROM sessions s
      LEFT JOIN messages m ON m.session_id = s.session_id
      ${search ? sql`JOIN messages ms ON ms.session_id = s.session_id AND ms.search_text @@ to_tsquery('english', plainto_tsquery('english', ${search})::text || ':*')` : sql``}
      ${state ? sql`WHERE s.collection_state = ${state}` : sql``}
      GROUP BY s.session_id
      ORDER BY s.created_at DESC
      LIMIT ${cappedLimit}
    `);

    return rows.rows.map((row) => ({
      sessionId: row.session_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      collectionState: row.collection_state,
      userName: row.user_name,
      userPhone: row.user_phone,
      preferredCallTime: row.preferred_call_time,
      callbackTopic: row.callback_topic,
      messageCount: Number(row.message_count),
      firstMessage: row.first_message ?? null,
    }));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .delete(sessions)
      .where(sql`${sessions.expiresAt} < NOW()`)
      .returning();

    return result.length;
  }
}
