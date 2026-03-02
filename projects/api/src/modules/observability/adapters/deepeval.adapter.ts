import { ConfigService } from '@/config/config.service';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
  CreateTraceOptions,
  LogGenerationOptions,
  LogRetrievalOptions,
  ObservabilityAdapter,
  TraceHandle,
  UpdateTraceOptions
} from '../observability.interface';

/**
 * Accumulated data for a DeepEval trace.
 * DeepEval's observe() pattern requires all data at once,
 * so we accumulate retrieval + generation data and send in updateTrace.
 */
interface DeepEvalTraceState {
  name: string;
  input: string | Record<string, unknown> | undefined;
  metadata: Record<string, unknown>;
  retrieval: {
    query: string;
    chunks: string[];
    scores?: number[];
    documentIds?: string[];
    model?: string;
    durationMs?: number;
  } | null;
  generation: {
    model: string;
    prompt: string | Array<{ role: string; content: string }>;
    response: string;
    durationMs?: number;
  } | null;
  output: string | Record<string, unknown> | undefined;
}

export class DeepEvalAdapter implements ObservabilityAdapter {
  readonly name = 'deepeval';
  private _enabled: boolean;
  private readonly logger = new Logger(DeepEvalAdapter.name);

  constructor(private readonly config: ConfigService) {
    this._enabled = config.confidentai.enabled;

    if (this._enabled && config.confidentai.apiKey) {
      // Set env var for deepeval-ts SDK
      process.env.CONFIDENT_API_KEY = config.confidentai.apiKey;
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  async getPrompt(): Promise<null> {
    // DeepEval does not have prompt management
    return null;
  }

  async createTrace(options: CreateTraceOptions): Promise<TraceHandle | null> {
    if (!this._enabled) return null;

    try {
      const state: DeepEvalTraceState = {
        name: options.name,
        input: options.input,
        metadata: {
          ...options.metadata,
          sessionId: options.sessionId,
          userId: options.userId,
          tags: options.tags,
        },
        retrieval: null,
        generation: null,
        output: undefined,
      };

      return { id: uuidv4(), _internal: state };
    } catch (e) {
      this.logger.warn(`Failed to create DeepEval trace: ${e}`);
      return null;
    }
  }

  async logRetrieval(options: LogRetrievalOptions): Promise<void> {
    const state = options.trace._internal as DeepEvalTraceState;
    if (!state) return;

    state.retrieval = {
      query: options.query,
      chunks: options.chunks,
      scores: options.scores,
      documentIds: options.documentIds,
      model: options.model,
      durationMs: options.durationMs,
    };
  }

  async logGeneration(options: LogGenerationOptions): Promise<void> {
    const state = options.trace._internal as DeepEvalTraceState;
    if (!state) return;

    state.generation = {
      model: options.model,
      prompt: options.prompt,
      response: options.response,
      durationMs: options.durationMs,
    };
  }

  async logEvent(): Promise<void> {
    // DeepEval doesn't have a generic event concept for tracing
  }

  async updateTrace(options: UpdateTraceOptions): Promise<void> {
    const state = options.trace._internal as DeepEvalTraceState;
    if (!state) return;

    state.output = options.output;

    // Send accumulated data to ConfidentAI via observe
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const deepeval = require('deepeval-ts') as {
        tracing: {
          observe: (opts: { type: string; name: string; model?: string; fn: () => Promise<unknown> }) => () => Promise<unknown>;
        };
      };
      const { tracing: deTracing } = deepeval;

      // Use observe to wrap a function that captures the trace data
      const tracedFn = deTracing.observe({
        type: 'custom',
        name: state.name,
        fn: async () => {
          // Log retrieval sub-span
          if (state.retrieval) {
            const retrieveFn = deTracing.observe({
              type: 'retriever',
              name: 'retrieval',
              fn: async () => state.retrieval!.chunks,
            });
            await retrieveFn();
          }

          // Log generation sub-span
          if (state.generation) {
            const genFn = deTracing.observe({
              type: 'llm',
              name: 'llm_generation',
              model: state.generation.model,
              fn: async () => state.generation!.response,
            });
            await genFn();
          }

          return typeof state.output === 'string' ? state.output : JSON.stringify(state.output);
        },
      });

      await tracedFn();
    } catch (e) {
      this.logger.warn(`Failed to send trace to ConfidentAI: ${e}`);
    }
  }

  async flush(): Promise<void> {
    // DeepEval handles flushing automatically
  }

  async shutdown(): Promise<void> {
    // DeepEval handles cleanup automatically
  }
}
