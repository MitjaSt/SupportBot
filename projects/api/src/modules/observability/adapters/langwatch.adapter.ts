import { ConfigService } from '@/config/config.service';
import { Logger } from '@nestjs/common';
import type { Span, Tracer } from '@opentelemetry/api';
import { context, trace } from '@opentelemetry/api';
import { FetchPolicy, getLangWatchTracer, LangWatch } from 'langwatch';
import NodeCache from 'node-cache';
import type {
  CreateTraceOptions,
  LogEventOptions,
  LogGenerationOptions,
  LogRetrievalOptions,
  ObservabilityAdapter,
  TraceHandle,
  UpdateTraceOptions,
} from '../observability.interface';
// langwatch/observability/node is a valid package export but TypeScript's moduleResolution: "node"
// doesn't understand package exports fields. Using require() so Node.js resolves it at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setupObservability } = require('langwatch/observability/node') as {
  setupObservability: (options: {
    langwatch: { apiKey: string };
    serviceName: string;
  }) => { shutdown: () => Promise<void> };
};

/**
 * The LangWatch SDK returns LangWatchSpanInternal from startSpan(), which extends the standard
 * OTEL Span with typed helper methods. Declaring the subset we use here avoids importing from
 * the SDK's internal dist paths.
 */
interface LangWatchSpan extends Span {
  setType(type: string): this;
  setInput(input: string): this;
  setOutput(output: string): this;
  setRAGContexts(contexts: Array<{ documentId: string; content: string; score?: number }>): this;
}

/** Internal state stored in trace handle. */
interface LangwatchTraceState {
  tracer: Tracer;
  rootSpan: LangWatchSpan;
}

export class LangwatchAdapter implements ObservabilityAdapter {
  readonly name = 'langwatch';
  private _enabled: boolean;
  private readonly logger = new Logger(LangwatchAdapter.name);
  private readonly tracer: Tracer;
  private readonly client: LangWatch;
  private shutdownFn: (() => Promise<void>) | undefined;
  private readonly cache = new NodeCache({ stdTTL: 5 * 60 });

  constructor(private readonly config: ConfigService) {
    this._enabled = config.langwatch.enabled;

    // Initialize LangWatch SDK - registers the OTEL exporter that sends spans to LangWatch.
    // Must be called before getLangWatchTracer() so the global provider has the exporter configured.
    const { shutdown } = setupObservability({
      langwatch: { apiKey: config.langwatch.apiKey },
      serviceName: 'macular-society-api',
    });
    this.shutdownFn = shutdown;

    this.tracer = getLangWatchTracer('macular-society-api');
    this.client = new LangWatch({ apiKey: config.langwatch.apiKey });
  }

  get enabled(): boolean {
    return this._enabled;
  }

  async getPrompt(chunks: string[], conversationHistory?: string): Promise<string | null> {
    const promptHandle = this.config.langwatch.promptSystem;
    if (!promptHandle) return null;

    try {
      let template = this.cache.get<string>(promptHandle);
      if (template === undefined) {
        const prompt = await this.client.prompts.get(promptHandle, {
          fetchPolicy: FetchPolicy.MATERIALIZED_FIRST,
        });
        const systemMessage = prompt.messages.find((m) => m.role === 'system');
        template = systemMessage?.content ?? undefined;
        if (template) {
          this.cache.set(promptHandle, template);
          this.logger.debug(`Fetched and cached '${promptHandle}' prompt from LangWatch`);
        }
      }

      if (!template) return null;

      return template
        .replace(/\{\{rag_context\}\}/g, chunks.join('\n'))
        .replace(/\{\{conversation_history\}\}/g, conversationHistory ?? '');
    } catch (error) {
      this.logger.error(`Failed to fetch prompt from LangWatch: ${error}`);
      return null;
    }
  }

  async createTrace(options: CreateTraceOptions): Promise<TraceHandle | null> {
    if (!this._enabled) return null;

    try {
      const rootSpan = this.tracer.startSpan(options.name) as LangWatchSpan;

      if (options.input) {
        rootSpan.setInput(
          typeof options.input === 'string' ? options.input : JSON.stringify(options.input),
        );
      }
      if (options.sessionId) {
        rootSpan.setAttribute('langwatch.thread.id', options.sessionId);
      }
      if (options.userId) {
        rootSpan.setAttribute('langwatch.user.id', options.userId);
      }
      if (options.tags) {
        rootSpan.setAttribute('langwatch.tags', JSON.stringify(options.tags));
      }

      const state: LangwatchTraceState = { tracer: this.tracer, rootSpan };
      return { id: rootSpan.spanContext().spanId, _internal: state };
    } catch (e) {
      this.logger.warn(`Failed to create LangWatch trace: ${e}`);
      return null;
    }
  }

  async logRetrieval(options: LogRetrievalOptions): Promise<void> {
    const state = options.trace._internal as LangwatchTraceState;
    if (!state) return;

    try {
      const ctx = trace.setSpan(context.active(), state.rootSpan);
      const span = state.tracer.startSpan('retrieval', {}, ctx) as LangWatchSpan;

      span.setType('rag');
      span.setInput(options.query);

      if (options.chunks.length > 0) {
        span.setRAGContexts(
          options.chunks.map((text, i) => ({
            documentId: options.documentIds?.[i] ?? `chunk_${i}`,
            content: text,
            score: options.scores?.[i],
          })),
        );
      }

      span.end();
    } catch (e) {
      this.logger.warn(`Failed to log retrieval span: ${e}`);
    }
  }

  async logGeneration(options: LogGenerationOptions): Promise<void> {
    const state = options.trace._internal as LangwatchTraceState;
    if (!state) return;

    try {
      const ctx = trace.setSpan(context.active(), state.rootSpan);
      const span = state.tracer.startSpan('llm_generation', {}, ctx) as LangWatchSpan;

      span.setType('llm');
      span.setInput(
        typeof options.prompt === 'string' ? options.prompt : JSON.stringify(options.prompt),
      );
      span.setOutput(options.response);

      if (options.model) {
        span.setAttribute('langwatch.request.model', options.model);
      }
      if (options.usage) {
        span.setAttribute(
          'langwatch.metrics',
          JSON.stringify({
            prompt_tokens: options.usage.promptTokens,
            completion_tokens: options.usage.completionTokens,
          }),
        );
      }

      span.end();
    } catch (e) {
      this.logger.warn(`Failed to log generation: ${e}`);
    }
  }

  async logEvent(options: LogEventOptions): Promise<void> {
    const state = options.trace._internal as LangwatchTraceState;
    if (!state) return;

    try {
      const ctx = trace.setSpan(context.active(), state.rootSpan);
      const span = state.tracer.startSpan(options.name, {}, ctx) as LangWatchSpan;

      if (options.inputData) {
        span.setInput(JSON.stringify(options.inputData));
      }
      if (options.outputData) {
        span.setOutput(JSON.stringify(options.outputData));
      }
      span.end();
    } catch (e) {
      this.logger.warn(`Failed to log event: ${e}`);
    }
  }

  async updateTrace(options: UpdateTraceOptions): Promise<void> {
    const state = options.trace._internal as LangwatchTraceState;
    if (!state) return;

    try {
      if (options.output) {
        state.rootSpan.setOutput(
          typeof options.output === 'string' ? options.output : JSON.stringify(options.output),
        );
      }
      state.rootSpan.end();
    } catch (e) {
      this.logger.warn(`Failed to update trace: ${e}`);
    }
  }

  async flush(): Promise<void> {
    // LangWatch SDK handles flushing via OpenTelemetry exporters automatically
  }

  async shutdown(): Promise<void> {
    await this.shutdownFn?.();
  }
}
