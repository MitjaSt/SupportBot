import { Static, Type } from '@sinclair/typebox';

export const FilesystemConfigSchema = Type.Object({
  cacheJsonDir: Type.String(),
  cacheFlatDir: Type.String(),
  cacheCriteriaDir: Type.String(),
  cacheSummariesDir: Type.String(),
  cachePromptsDir: Type.String(),
});

export const EmbeddingConfigSchema = Type.Object({
  provider: Type.Literal('openai'),
  model: Type.String(),
  vectorSize: Type.Number(),
});

export const RagConfigSchema = Type.Object({
  topK: Type.Number(),
  scoreThreshold: Type.Number(),
  maxTokens: Type.Number(),
  promptTokenWarnThreshold: Type.Number(),
  promptTokenRejectThreshold: Type.Number(),
  contextHistoryMessages: Type.Number(),
  hybridSearchEnabled: Type.Boolean(),
});

export const ChunkingConfigSchema = Type.Object({
  chunkSizeTokens: Type.Number(),
  overlapTokens: Type.Number(),
});

export const OpenAIConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  apiKey: Type.String(),
  adminApiKey: Type.String(),
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
  promptSystem: Type.String(),
  promptSummary: Type.String(),
});

export const LangwatchConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  apiKey: Type.String(),
  promptSystem: Type.String(),
});

export const ConfidentAIConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  apiKey: Type.String(),
});

export const FollowupConfigSchema = Type.Object({
  enabled: Type.Boolean(),
});

export const WhisperConfigSchema = Type.Object({
  url: Type.String(),
});

export const PiperConfigSchema = Type.Object({
  url: Type.String(),
});

export const PromptGuardConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  url: Type.String(),
});

export const ZitadelConfigSchema = Type.Object({
  enabled: Type.Boolean(),
  jwksUri: Type.String(),
  issuer: Type.String(),
  audience: Type.String(),
});

export const EnvConfigSchema = Type.Object({
  filesystem: FilesystemConfigSchema,
  embedding: EmbeddingConfigSchema,
  rag: RagConfigSchema,
  chunking: ChunkingConfigSchema,
  openai: OpenAIConfigSchema,
  postgres: PostgresConfigSchema,
  scraping: ScrapingConfigSchema,
  langfuse: LangfuseConfigSchema,
  langwatch: LangwatchConfigSchema,
  confidentai: ConfidentAIConfigSchema,
  followup: FollowupConfigSchema,
  whisper: WhisperConfigSchema,
  piper: PiperConfigSchema,
  promptGuard: PromptGuardConfigSchema,
  zitadel: ZitadelConfigSchema,
});

export type FilesystemConfig = Static<typeof FilesystemConfigSchema>;
export type EmbeddingConfig = Static<typeof EmbeddingConfigSchema>;
export type RagConfig = Static<typeof RagConfigSchema>;
export type ChunkingConfig = Static<typeof ChunkingConfigSchema>;
export type OpenAIConfig = Static<typeof OpenAIConfigSchema>;
export type PostgresConfig = Static<typeof PostgresConfigSchema>;
export type ScrapingConfig = Static<typeof ScrapingConfigSchema>;
export type LangfuseConfig = Static<typeof LangfuseConfigSchema>;
export type LangwatchConfig = Static<typeof LangwatchConfigSchema>;
export type ConfidentAIConfig = Static<typeof ConfidentAIConfigSchema>;
export type FollowupConfig = Static<typeof FollowupConfigSchema>;
export type WhisperConfig = Static<typeof WhisperConfigSchema>;
export type PiperConfig = Static<typeof PiperConfigSchema>;
export type PromptGuardConfig = Static<typeof PromptGuardConfigSchema>;
export type ZitadelConfig = Static<typeof ZitadelConfigSchema>;
export type EnvConfig = Static<typeof EnvConfigSchema>;
