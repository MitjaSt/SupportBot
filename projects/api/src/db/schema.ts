import { relations, sql } from 'drizzle-orm';
import {
  customType,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Custom pgvector type for Drizzle ORM
const vector = (name: string, config: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${config.dimensions})`;
    },
    toDriver(value: number[]): string {
      return JSON.stringify(value);
    },
    fromDriver(value: string): number[] {
      return typeof value === 'string' ? JSON.parse(value) : value;
    },
  })(name);

// Enums
export const collectionStateEnum = pgEnum('collection_state', [
  'idle',
  'offering',
  'collecting__user_phone',
  'collecting__user_name',
  'collecting_user_time',
  'confirming',
  'complete',
]);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant']);

// Sessions table
export const sessions = pgTable('sessions', {
  sessionId: text('session_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  userPhone: text('user_phone'),
  userName: text('user_name'),
  preferredCallTime: text('preferred_call_time'),
  collectionState: collectionStateEnum('collection_state').default('idle'),
  callbackTopic: text('callback_topic'),
  userId: text('user_id'),  // Zitadel sub — null for anonymous sessions
});

// Messages table
export const messages = pgTable('messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.sessionId, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  chunks: jsonb('chunks'),
  fullPrompt: text('full_prompt'),
  promptTokenCount: integer('prompt_token_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const sessionsRelations = relations(sessions, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.sessionId],
  }),
}));

// Vectors table for pgvector embeddings
export const vectors = pgTable('vectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  text: text('text').notNull(),
  source: text('source').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  chunkLength: integer('chunk_length'),
  title: text('title'),
  url: text('url'),
  searchText: customType<{ data: string }>({ dataType: () => 'tsvector' })('search_text')
    .generatedAlwaysAs(sql`to_tsvector('english', coalesce(title, '') || ' ' || text)`)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type CollectionState = (typeof collectionStateEnum.enumValues)[number];
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
export type Vector = typeof vectors.$inferSelect;
export type NewVector = typeof vectors.$inferInsert;
