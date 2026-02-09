import { Type, Static } from '@sinclair/typebox';

export const QueryRequestSchema = Type.Object({
  query: Type.String({ minLength: 1 }).transform((value: string) => value.trim()),
  sessionId: Type.Optional(Type.String()),
});

export type QueryRequest = Static<typeof QueryRequestSchema>;

export const SourceSchema = Type.Object({
  id: Type.String(),
  score: Type.Number(),
  text: Type.String(),
  source: Type.String(),
  chunkIndex: Type.Number(),
});

export type Source = Static<typeof SourceSchema>;

export const QueryResponseSchema = Type.Object({
  answer: Type.String(),
  sources: Type.Array(SourceSchema),
  model: Type.String(),
  backend: Type.Literal('openai'),
  sessionId: Type.String(),
  collectionState: Type.String(),
});

export type QueryResponse = Static<typeof QueryResponseSchema>;
