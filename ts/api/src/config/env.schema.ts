import { Type, Static } from '@sinclair/typebox';

export const FilesystemConfigSchema = Type.Object({
  cacheJsonDir: Type.String(),
  cacheFlatDir: Type.String(),
  cacheSummariesDir: Type.String(),
  cachePromptsDir: Type.String(),
});

export const EmbeddingConfigSchema = Type.Object({
  provider: Type.Union([Type.Literal('openai'), Type.Literal('ollama')]),
  model: Type.String(),
  vectorSize: Type.Number(),
});

export const RagConfigSchema = Type.Object({
  topK: Type.Number(),
  scoreThreshold: Type.Number(),
  maxTokens: Type.Number(),
});

export const ChunkingConfigSchema = Type.Object({
  chunkSizeTokens: Type.Number(),
  overlapTokens: Type.Number(),
});

export const QdrantConfigSchema = Type.Object({
  host: Type.String(),
  port: Type.Number(),
  collectionName: Type.String(),
});

export const OllamaConfigSchema = Type.Object({
  url: Type.String(),
  model: Type.String(),
  timeout: Type.Number(),
});

export const OpenAIConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  apiKey: Type.String(),
  embeddingModel: Type.String(),
  chatModel: Type.String(),
  timeout: Type.Number(),
});

export const PostgresConfigSchema = Type.Object({
  host: Type.String(),
  port: Type.Number(),
  database: Type.String(),
  user: Type.String(),
  password: Type.String(),
  sessionExpiryHours: Type.Number(),
  maxHistoryMessages: Type.Number(),
});

export const ScrapingConfigSchema = Type.Object({
  maxConcurrent: Type.Number(),
  sitemapUrl: Type.String(),
});

export const LangfuseConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  secretKey: Type.String(),
  publicKey: Type.String(),
  baseUrl: Type.String(),
});

export const EnvConfigSchema = Type.Object({
  filesystem: FilesystemConfigSchema,
  embedding: EmbeddingConfigSchema,
  rag: RagConfigSchema,
  chunking: ChunkingConfigSchema,
  qdrant: QdrantConfigSchema,
  ollama: OllamaConfigSchema,
  openai: OpenAIConfigSchema,
  postgres: PostgresConfigSchema,
  scraping: ScrapingConfigSchema,
  langfuse: LangfuseConfigSchema,
});

export type FilesystemConfig = Static<typeof FilesystemConfigSchema>;
export type EmbeddingConfig = Static<typeof EmbeddingConfigSchema>;
export type RagConfig = Static<typeof RagConfigSchema>;
export type ChunkingConfig = Static<typeof ChunkingConfigSchema>;
export type QdrantConfig = Static<typeof QdrantConfigSchema>;
export type OllamaConfig = Static<typeof OllamaConfigSchema>;
export type OpenAIConfig = Static<typeof OpenAIConfigSchema>;
export type PostgresConfig = Static<typeof PostgresConfigSchema>;
export type ScrapingConfig = Static<typeof ScrapingConfigSchema>;
export type LangfuseConfig = Static<typeof LangfuseConfigSchema>;
export type EnvConfig = Static<typeof EnvConfigSchema>;
