import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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
});

// Messages table
export const messages = pgTable('messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.sessionId, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
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

// Types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type CollectionState = (typeof collectionStateEnum.enumValues)[number];
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
