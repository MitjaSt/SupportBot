import { Logger } from '@nestjs/common';
import { getLangWatchTracer, attributes } from 'langwatch';
import type { Tracer, Span } from '@opentelemetry/api';
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

/** Internal state stored in trace handle. */
interface LangwatchTraceState {
  tracer: Tracer;
  rootSpan: Span;
}

export class LangwatchAdapter implements ObservabilityAdapter {
  readonly name = 'langwatch';
  private _enabled: boolean;
  private readonly logger = new Logger(LangwatchAdapter.name);
  private readonly tracer: Tracer;

  constructor(private readonly config: ConfigService) {
    this._enabled = config.langwatch.enabled;

    // Set API key via env var before creating tracer
    process.env.LANGWATCH_API_KEY = config.langwatch.apiKey;
    this.tracer = getLangWatchTracer('macular-society-api');
  }

  get enabled(): boolean {
    return this._enabled;
  }

  async getPrompt(): Promise<string | null> {
    // LangWatch JS SDK prompt management is limited compared to Python.
    // Return null and let the fallback handle it.
    return null;
  }

  async createTrace(options: CreateTraceOptions): Promise<TraceHandle | null> {
    if (!this._enabled) return null;

    try {
      const rootSpan = this.tracer.startSpan(options.name);

      // Set LangWatch-specific attributes
      if (options.input) {
        rootSpan.setAttribute(
          attributes.ATTR_LANGWATCH_INPUT,
          typeof options.input === 'string' ? options.input : JSON.stringify(options.input),
        );
      }
      if (options.sessionId) {
        rootSpan.setAttribute(attributes.ATTR_LANGWATCH_THREAD_ID, options.sessionId);
      }
      if (options.userId) {
        rootSpan.setAttribute(attributes.ATTR_LANGWATCH_USER_ID, options.userId);
      }
      if (options.tags) {
        rootSpan.setAttribute(attributes.ATTR_LANGWATCH_TAGS, JSON.stringify(options.tags));
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
      const span = state.tracer.startSpan('retrieval');
      span.setAttribute(attributes.ATTR_LANGWATCH_SPAN_TYPE, 'rag');
      span.setAttribute(
        attributes.ATTR_LANGWATCH_INPUT,
        JSON.stringify({ query: options.query }),
      );
      span.setAttribute(
        attributes.ATTR_LANGWATCH_OUTPUT,
        JSON.stringify({
          chunks: options.chunks.slice(0, 3),
          chunk_count: options.chunks.length,
          scores: options.scores,
          document_ids: options.documentIds,
        }),
      );

      if (options.chunks.length > 0) {
        const ragContexts = options.chunks.map((text, i) => ({
          documentId: options.documentIds?.[i] ?? `chunk_${i}`,
          content: text,
          score: options.scores?.[i],
        }));
        span.setAttribute(
          attributes.ATTR_LANGWATCH_RAG_CONTEXTS,
          JSON.stringify(ragContexts),
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
      const span = state.tracer.startSpan('llm_generation');
      span.setAttribute(attributes.ATTR_LANGWATCH_SPAN_TYPE, 'llm');
      span.setAttribute(
        attributes.ATTR_LANGWATCH_INPUT,
        typeof options.prompt === 'string' ? options.prompt : JSON.stringify(options.prompt),
      );
      span.setAttribute(attributes.ATTR_LANGWATCH_OUTPUT, options.response);

      if (options.model) {
        span.setAttribute('llm.model', options.model);
      }
      if (options.usage) {
        span.setAttribute(
          attributes.ATTR_LANGWATCH_METRICS,
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
      const span = state.tracer.startSpan(options.name);
      if (options.inputData) {
        span.setAttribute(
          attributes.ATTR_LANGWATCH_INPUT,
          JSON.stringify(options.inputData),
        );
      }
      if (options.outputData) {
        span.setAttribute(
          attributes.ATTR_LANGWATCH_OUTPUT,
          JSON.stringify(options.outputData),
        );
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
        state.rootSpan.setAttribute(
          attributes.ATTR_LANGWATCH_OUTPUT,
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
    // LangWatch SDK cleanup handled by OpenTelemetry
  }
}
