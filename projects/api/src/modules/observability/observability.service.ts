import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';
import type {
  ObservabilityAdapter,
  TraceHandle,
  CreateTraceOptions,
  LogRetrievalOptions,
  LogGenerationOptions,
  LogEventOptions,
  UpdateTraceOptions,
} from './observability.interface';
import { NullAdapter } from './adapters/null.adapter';
import { LangfuseAdapter } from './adapters/langfuse.adapter';
import { LangwatchAdapter } from './adapters/langwatch.adapter';
import { DeepEvalAdapter } from './adapters/deepeval.adapter';

/** Composite trace wrapping handles from multiple adapters. */
interface CompositeHandle {
  adapterName: string;
  handle: TraceHandle;
}

@Injectable()
export class ObservabilityService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ObservabilityService.name);
  private adapters: ObservabilityAdapter[] = [];

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.config.langfuse.enabled) {
      try {
        this.adapters.push(new LangfuseAdapter(this.config));
        this.logger.log('LangFuse adapter enabled');
      } catch (e) {
        this.logger.warn(`Failed to initialize LangFuse adapter: ${e}`);
      }
    }

    if (this.config.langwatch.enabled) {
      try {
        this.adapters.push(new LangwatchAdapter(this.config));
        this.logger.log('LangWatch adapter enabled');
      } catch (e) {
        this.logger.warn(`Failed to initialize LangWatch adapter: ${e}`);
      }
    }

    if (this.config.confidentai.enabled) {
      try {
        this.adapters.push(new DeepEvalAdapter(this.config));
        this.logger.log('ConfidentAI/DeepEval adapter enabled');
      } catch (e) {
        this.logger.warn(`Failed to initialize DeepEval adapter: ${e}`);
      }
    }

    if (this.adapters.length === 0) {
      this.logger.log('No observability adapters enabled, using NullAdapter');
      this.adapters.push(new NullAdapter());
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled(this.adapters.map((a) => a.shutdown()));
  }

  get enabled(): boolean {
    return this.adapters.some((a) => a.enabled);
  }

  /**
   * Get a prompt from the first adapter that supports prompt management.
   * Priority: LangFuse > LangWatch > null.
   */
  async getPrompt(chunks: string[], conversationHistory?: string): Promise<string | null> {
    for (const adapter of this.adapters) {
      if (!adapter.enabled) continue;
      try {
        const prompt = await adapter.getPrompt(chunks, conversationHistory);
        if (prompt !== null) return prompt;
      } catch (e) {
        this.logger.warn(`${adapter.name}.getPrompt failed: ${e}`);
      }
    }
    return null;
  }

  /**
   * Create traces across all enabled adapters.
   * Returns a composite TraceHandle wrapping all individual handles.
   */
  async createTrace(options: CreateTraceOptions): Promise<TraceHandle | null> {
    const handles: CompositeHandle[] = [];

    await Promise.allSettled(
      this.adapters
        .filter((a) => a.enabled)
        .map(async (adapter) => {
          try {
            const handle = await adapter.createTrace(options);
            if (handle) {
              handles.push({ adapterName: adapter.name, handle });
            }
          } catch (e) {
            this.logger.warn(`${adapter.name}.createTrace failed: ${e}`);
          }
        }),
    );

    if (handles.length === 0) return null;

    return {
      id: handles[0].handle.id,
      _internal: handles,
    };
  }

  async logRetrieval(options: LogRetrievalOptions): Promise<void> {
    const handles = this.unwrapHandles(options.trace);
    await Promise.allSettled(
      handles.map(({ adapterName, handle }) => {
        const adapter = this.adapters.find((a) => a.name === adapterName);
        if (!adapter) return Promise.resolve();
        return adapter
          .logRetrieval({ ...options, trace: handle })
          .catch((e) => this.logger.warn(`${adapterName}.logRetrieval failed: ${e}`));
      }),
    );
  }

  async logGeneration(options: LogGenerationOptions): Promise<void> {
    const handles = this.unwrapHandles(options.trace);
    await Promise.allSettled(
      handles.map(({ adapterName, handle }) => {
        const adapter = this.adapters.find((a) => a.name === adapterName);
        if (!adapter) return Promise.resolve();
        return adapter
          .logGeneration({ ...options, trace: handle })
          .catch((e) => this.logger.warn(`${adapterName}.logGeneration failed: ${e}`));
      }),
    );
  }

  async logEvent(options: LogEventOptions): Promise<void> {
    const handles = this.unwrapHandles(options.trace);
    await Promise.allSettled(
      handles.map(({ adapterName, handle }) => {
        const adapter = this.adapters.find((a) => a.name === adapterName);
        if (!adapter) return Promise.resolve();
        return adapter
          .logEvent({ ...options, trace: handle })
          .catch((e) => this.logger.warn(`${adapterName}.logEvent failed: ${e}`));
      }),
    );
  }

  async updateTrace(options: UpdateTraceOptions): Promise<void> {
    const handles = this.unwrapHandles(options.trace);
    await Promise.allSettled(
      handles.map(({ adapterName, handle }) => {
        const adapter = this.adapters.find((a) => a.name === adapterName);
        if (!adapter) return Promise.resolve();
        return adapter
          .updateTrace({ ...options, trace: handle })
          .catch((e) => this.logger.warn(`${adapterName}.updateTrace failed: ${e}`));
      }),
    );
  }

  async flush(): Promise<void> {
    await Promise.allSettled(this.adapters.map((a) => a.flush()));
  }

  private unwrapHandles(trace: TraceHandle): CompositeHandle[] {
    return (trace._internal as CompositeHandle[]) ?? [];
  }
}
