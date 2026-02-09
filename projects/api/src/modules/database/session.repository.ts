import { Injectable } from '@nestjs/common';
import { eq, gt, desc, sql, count, asc, inArray } from 'drizzle-orm';
import { ConfigService } from '@/config/config.service';
import { DatabaseService } from './database.service';
import {
  sessions,
  messages,
  type Session,
  type Message,
  type CollectionState,
} from '@/db/schema';

// Re-export types for consumers
export type { Session, Message, CollectionState } from '@/db/schema';

@Injectable()
export class SessionRepository {
  private readonly expiryHours: number;
  private readonly maxHistory: number;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.expiryHours = config.postgres.sessionExpiryHours;
    this.maxHistory = config.postgres.maxHistoryMessages;
  }

  private get db() {
    return this.dbService.db;
  }

  private getExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.expiryHours);
    return expiresAt;
  }

  async createSession(sessionId: string): Promise<Session> {
    const [session] = await this.db
      .insert(sessions)
      .values({
        sessionId,
        expiresAt: this.getExpiresAt(),
      })
      .returning();

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

  async getOrCreateSession(sessionId: string): Promise<Session> {
    const existing = await this.getSession(sessionId);
    if (existing) {
      return existing;
    }
    return this.createSession(sessionId);
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
  ): Promise<void> {
    await this.db.insert(messages).values({
      sessionId,
      role,
      content,
    });

    // Trim old messages if over limit - keep newest ones
    const allMessages = await this.db
      .select({ id: messages.id })
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt));

    if (allMessages.length > this.maxHistory) {
      const idsToDelete = allMessages
        .slice(this.maxHistory)
        .map((m: { id: number }) => m.id);
      if (idsToDelete.length > 0) {
        await this.db
          .delete(messages)
          .where(inArray(messages.id, idsToDelete));
      }
    }
  }

  async getMessages(sessionId: string): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt))
      .limit(this.maxHistory);
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

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .delete(sessions)
      .where(sql`${sessions.expiresAt} < NOW()`)
      .returning();

    return result.length;
  }
}
