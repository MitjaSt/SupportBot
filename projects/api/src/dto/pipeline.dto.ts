import { Type, Static } from '@sinclair/typebox';

export const PipelineStatusSchema = Type.Object({
  status: Type.Union([
    Type.Literal('idle'),
    Type.Literal('running'),
    Type.Literal('completed'),
    Type.Literal('error'),
  ]),
  stage: Type.Optional(Type.String()),
  progress: Type.Optional(Type.Number()),
  message: Type.Optional(Type.String()),
});

export type PipelineStatus = Static<typeof PipelineStatusSchema>;

export const ScrapeResultSchema = Type.Object({
  scraped: Type.Number(),
  failed: Type.Number(),
  duration: Type.Number(),
});

export type ScrapeResult = Static<typeof ScrapeResultSchema>;

export const ProcessResultSchema = Type.Object({
  processed: Type.Number(),
  skipped: Type.Number(),
  chunks: Type.Number(),
  duration: Type.Number(),
});

export type ProcessResult = Static<typeof ProcessResultSchema>;

export const EmbedResultSchema = Type.Object({
  embedded: Type.Number(),
  vectorSize: Type.Number(),
  model: Type.String(),
  duration: Type.Number(),
});

export type EmbedResult = Static<typeof EmbedResultSchema>;

export const SummarizeResultSchema = Type.Object({
  summarized: Type.Number(),
  skipped: Type.Number(),
  errors: Type.Number(),
  duration: Type.Number(),
});

export type SummarizeResult = Static<typeof SummarizeResultSchema>;

export const CollectionInfoSchema = Type.Object({
  collectionName: Type.String(),
  pointsCount: Type.Number(),
  vectorsCount: Type.Number(),
});

export type CollectionInfo = Static<typeof CollectionInfoSchema>;
