import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';
import { resolve } from 'path';
import type {
  ChunkingConfig,
  ConfidentAIConfig,
  EmbeddingConfig,
  EnvConfig,
  FilesystemConfig,
  FollowupConfig,
  LangfuseConfig,
  LangwatchConfig,
  OpenAIConfig,
  PiperConfig,
  PostgresConfig,
  PromptGuardConfig,
  RagConfig,
  ScrapingConfig,
  WhisperConfig,
} from './env.schema';

// Load .env from project root (shared with Python)
config({ path: resolve(__dirname, '../../../../.env'), override: true });

function getRequired(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable '${key}' is not set`);
  }
  return value;
}

function getOptional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseFloat(value) : defaultValue;
}

function getBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]?.toLowerCase();
  if (!value) return defaultValue;
  return value === 'true' || value === '1';
}

@Injectable()
export class ConfigService {
  private readonly config: EnvConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvConfig {
    const filesystem: FilesystemConfig = {
      cacheJsonDir: getRequired('CACHE_DIR_JSON'),
      cacheFlatDir: getRequired('CACHE_DIR_FLAT'),
      cacheSummariesDir: getRequired('CACHE_DIR_SUMMARIES'),
      cacheCriteriaDir: getRequired('CACHE_DIR_CRITERIA'),
      cachePromptsDir: getRequired('CACHE_DIR_PROMPTS'),
    };

    const embedding: EmbeddingConfig = {
      provider: 'openai',
      model: getOptional('EMBEDDING_MODEL', 'text-embedding-3-small'),
      vectorSize: getInt('EMBEDDING_VECTOR_SIZE', 1536),
    };

    const rag: RagConfig = {
      topK: getInt('RAG_TOP_K', 3),
      scoreThreshold: getFloat('RAG_SCORE_THRESHOLD', 0.5),
      maxTokens: getInt('RAG_MAX_TOKENS', 4096),
      promptTokenWarnThreshold: getInt('RAG_PROMPT_TOKEN_WARN_THRESHOLD', 2000),
      promptTokenRejectThreshold: getInt('RAG_PROMPT_TOKEN_REJECT_THRESHOLD', 4000),
      contextHistoryMessages: parseInt(getRequired('RAG_CONTEXT_HISTORY_MESSAGES'), 10),
    };

    const chunking: ChunkingConfig = {
      chunkSizeTokens: getInt('CHUNKING_SIZE_TOKENS', 256),
      overlapTokens: getInt('CHUNKING_OVERLAP_TOKENS', 100),
    };

    const openai: OpenAIConfig = {
      enabled: getBool('OPENAI_ENABLE', false),
      apiKey: getOptional('OPENAI_API_KEY', ''),
      adminApiKey: getOptional('OPENAI_ADMIN_KEY', ''),
      embeddingModel: getOptional('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
      chatModel: getRequired('OPENAI_MODEL'),
      timeout: getInt('OPENAI_TIMEOUT', 120),
    };

    const postgres: PostgresConfig = {
      host: getOptional('POSTGRES_HOST', 'localhost'),
      port: getInt('POSTGRES_PORT', 5432),
      database: getOptional('POSTGRES_DATABASE', 'macular_society'),
      user: getOptional('POSTGRES_USER', 'macular'),
      password: getOptional('POSTGRES_PASSWORD', 'macular_dev'),
      sessionExpiryHours: getInt('POSTGRES_SESSION_EXPIRY_HOURS', 24),
    };

    const scraping: ScrapingConfig = {
      maxConcurrent: getInt('MAX_CONCURRENT_SCRAPES', 5),
      sitemapUrl: getOptional(
        'SITEMAP_URL',
        'https://www.macularsociety.org/sitemap.xml',
      ),
    };

    const langfuse: LangfuseConfig = {
      enabled: getBool('LANGFUSE_ENABLE', false),
      secretKey: getOptional('LANGFUSE_SECRET_KEY', ''),
      publicKey: getOptional('LANGFUSE_PUBLIC_KEY', ''),
      baseUrl: getOptional('LANGFUSE_BASE_URL', 'https://cloud.langfuse.com'),
      promptSystem: getRequired('LANGFUSE_PROMPT_SYSTEM',),
      promptSummary: getRequired('LANGFUSE_PROMPT_SUMMARY'),
    };

    const langwatch: LangwatchConfig = {
      enabled: getBool('LANGWATCH_ENABLE', false),
      apiKey: getRequired('LANGWATCH_API_KEY'),
      promptSystem: getRequired('LANGWATCH_PROMPT_SYSTEM'),
    };

    const confidentai: ConfidentAIConfig = {
      enabled: getBool('CONFIDENTAI_ENABLE', false),
      apiKey: getRequired('CONFIDENTAI_API_KEY'),
    };

    const whisper: WhisperConfig = {
      url: getOptional('WHISPER_URL', 'http://localhost:8000'),
    };

    const followup: FollowupConfig = {
      enabled: getBool('FOLLOWUP_SUGGESTIONS_ENABLED', false),
    };

    const piper: PiperConfig = {
      url: getOptional('PIPER_URL', 'http://localhost:8001'),
    };

    const promptGuard: PromptGuardConfig = {
      enabled: getBool('PROMPT_GUARD_ENABLE', false),
      url: getOptional('PROMPT_GUARD_URL', 'http://localhost:8002'),
    };

    return {
      filesystem,
      embedding,
      rag,
      chunking,
      openai,
      postgres,
      scraping,
      langfuse,
      langwatch,
      confidentai,
      followup,
      whisper,
      piper,
      promptGuard,
    };
  }

  get filesystem(): FilesystemConfig {
    return this.config.filesystem;
  }

  get embedding(): EmbeddingConfig {
    return this.config.embedding;
  }

  get rag(): RagConfig {
    return this.config.rag;
  }

  get chunking(): ChunkingConfig {
    return this.config.chunking;
  }

  get openai(): OpenAIConfig {
    return this.config.openai;
  }

  get postgres(): PostgresConfig {
    return this.config.postgres;
  }

  get scraping(): ScrapingConfig {
    return this.config.scraping;
  }

  get langfuse(): LangfuseConfig {
    return this.config.langfuse;
  }

  get langwatch(): LangwatchConfig {
    return this.config.langwatch;
  }

  get confidentai(): ConfidentAIConfig {
    return this.config.confidentai;
  }

  get whisper(): WhisperConfig {
    return this.config.whisper;
  }

  get followup(): FollowupConfig {
    return this.config.followup;
  }

  get piper(): PiperConfig {
    return this.config.piper;
  }

  get promptGuard(): PromptGuardConfig {
    return this.config.promptGuard;
  }
}
