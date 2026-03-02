import { ConfigService } from '@/config/config.service';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DeepEvalAdapter } from './adapters/deepeval.adapter';
import { LangfuseAdapter } from './adapters/langfuse.adapter';
import { LangwatchAdapter } from './adapters/langwatch.adapter';
import { NullAdapter } from './adapters/null.adapter';
import type {
  CreateTraceOptions,
  LogEventOptions,
  LogGenerationOptions,
  PromptTemplate,
  LogRetrievalOptions,
  ObservabilityAdapter,
  TraceHandle,
  UpdateTraceOptions,
} from './observability.interface';

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

  /** Get the system prompt from the first adapter that has one. Priority: LangWatch first. */
  async getPrompt(): Promise<PromptTemplate | null> {
    return this.firstResult('getPrompt', (a) => a.getPrompt());
  }

  /**
   * Try each enabled adapter in LangWatch-first order, returning the first non-null result.
   * Logs a debug on success and a warn on per-adapter failure.
   */
  private async firstResult<T>(
    method: string,
    call: (adapter: ObservabilityAdapter) => Promise<T | null>,
  ): Promise<T | null> {
    const ordered = [
      ...this.adapters.filter((a) => a.name === 'langwatch'),
      ...this.adapters.filter((a) => a.name !== 'langwatch'),
    ];
    for (const adapter of ordered) {
      if (!adapter.enabled) continue;
      try {
        const result = await call(adapter);
        if (result !== null) {
          this.logger.debug(`${method} resolved from adapter: ${adapter.name}`);
          return result;
        }
      } catch (e) {
        this.logger.warn(`${adapter.name}.${method} failed: ${e}`);
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
