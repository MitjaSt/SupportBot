import { Logger } from '@nestjs/common';
import { Langfuse } from 'langfuse';
import { ConfigService } from '@/config/config.service';
import type {
  ObservabilityAdapter,
  TraceHandle,
  CreateTraceOptions,
  LogRetrievalOptions,
  LogGenerationOptions,
  LogEventOptions,
  UpdateTraceOptions,
} from '../observability.interface';

export class LangfuseAdapter implements ObservabilityAdapter {
  readonly name = 'langfuse';
  private _enabled: boolean;
  private readonly logger = new Logger(LangfuseAdapter.name);
  private readonly client: Langfuse;
  private readonly promptSystem: string;
  private promptTemplate: unknown | null = null;

  constructor(private readonly config: ConfigService) {
    this._enabled = config.langfuse.enabled;

    this.client = new Langfuse({
      secretKey: config.langfuse.secretKey,
      publicKey: config.langfuse.publicKey,
      baseUrl: config.langfuse.baseUrl,
    });
    this.promptSystem = config.langfuse.promptSystem;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  async getPrompt(chunks: string[], conversationHistory?: string): Promise<string | null> {
    if (!this._enabled) return null;

    try {
      if (this.promptTemplate === null) {
        this.promptTemplate = await this.client.getPrompt(this.promptSystem);
        this.logger.debug(`Fetched and cached '${this.promptSystem}' prompt from LangFuse`);
      }

      const compiled = (this.promptTemplate as { compile: (vars: Record<string, string>) => string }).compile({
        rag_context: chunks.join('\n'),
        conversation_history: conversationHistory ?? '',
      });

      return typeof compiled === 'string' ? compiled : String(compiled);
    } catch (e) {
      this.logger.warn(`Failed to get prompt from LangFuse: ${e}`);
      return null;
    }
  }

  async createTrace(options: CreateTraceOptions): Promise<TraceHandle | null> {
    if (!this._enabled) return null;

    try {
      const trace = this.client.trace({
        name: options.name,
        sessionId: options.sessionId,
        userId: options.userId,
        input: options.input,
        metadata: options.metadata ?? {},
        tags: options.tags ?? [],
      });

      return { id: trace.id, _internal: trace };
    } catch (e) {
      this.logger.warn(`Failed to create LangFuse trace: ${e}`);
      return null;
    }
  }

  async logRetrieval(options: LogRetrievalOptions): Promise<void> {
    const trace = options.trace._internal as ReturnType<Langfuse['trace']>;
    if (!trace) return;

    try {
      const metadata: Record<string, unknown> = { ...options.metadata };
      if (options.model) metadata.embedding_model = options.model;
      if (options.durationMs !== null) metadata.duration_ms = options.durationMs;

      trace.span({
        name: 'retrieval',
        input: { query: options.query },
        output: {
          chunks: options.chunks,
          chunk_count: options.chunks.length,
          scores: options.scores,
          document_ids: options.documentIds,
        },
        metadata,
      });
    } catch (e) {
      this.logger.warn(`Failed to log retrieval span: ${e}`);
    }
  }

  async logGeneration(options: LogGenerationOptions): Promise<void> {
    const trace = options.trace._internal as ReturnType<Langfuse['trace']>;
    if (!trace) return;

    try {
      const metadata: Record<string, unknown> = { ...options.metadata };
      if (options.durationMs !== null) metadata.duration_ms = options.durationMs;

      trace.generation({
        name: 'llm_generation',
        model: options.model,
        input: options.prompt,
        output: options.response,
        usage: options.usage
          ? {
              promptTokens: options.usage.promptTokens,
              completionTokens: options.usage.completionTokens,
              totalTokens: options.usage.totalTokens,
            }
          : undefined,
        metadata,
      });
    } catch (e) {
      this.logger.warn(`Failed to log generation: ${e}`);
    }
  }

  async logEvent(options: LogEventOptions): Promise<void> {
    const trace = options.trace._internal as ReturnType<Langfuse['trace']>;
    if (!trace) return;

    try {
      trace.event({
        name: options.name,
        input: options.inputData,
        output: options.outputData,
        metadata: options.metadata ?? {},
      });
    } catch (e) {
      this.logger.warn(`Failed to log event: ${e}`);
    }
  }

  async updateTrace(options: UpdateTraceOptions): Promise<void> {
    const trace = options.trace._internal as ReturnType<Langfuse['trace']>;
    if (!trace) return;

    try {
      trace.update({
        output: options.output,
        metadata: options.metadata,
      });
    } catch (e) {
      this.logger.warn(`Failed to update trace: ${e}`);
    }
  }

  async flush(): Promise<void> {
    try {
      await this.client.flushAsync();
    } catch (e) {
      this.logger.warn(`Failed to flush LangFuse events: ${e}`);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.client.shutdownAsync();
    } catch (e) {
      this.logger.warn(`Failed to shutdown LangFuse: ${e}`);
    }
  }
}
