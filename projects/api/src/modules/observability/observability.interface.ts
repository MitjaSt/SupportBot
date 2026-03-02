/**
 * Unified observability interface for tracing RAG requests.
 * Matches the Python ObserverProtocol from src/lib/observer.py.
 */

/** Opaque trace handle wrapping provider-specific trace objects. */
export interface TraceHandle {
  readonly id: string;
  readonly _internal: unknown;
}

/** Token usage statistics for a generation span. */
export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface CreateTraceOptions {
  name: string;
  sessionId?: string;
  userId?: string;
  input?: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface LogRetrievalOptions {
  trace: TraceHandle;
  query: string;
  chunks: string[];
  scores?: number[];
  documentIds?: string[];
  model?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface LogGenerationOptions {
  trace: TraceHandle;
  model: string;
  prompt: string | Array<{ role: string; content: string }>;
  response: string;
  usage?: TokenUsage;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface LogEventOptions {
  trace: TraceHandle;
  name: string;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateTraceOptions {
  trace: TraceHandle;
  output?: string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/** Raw prompt template with its source identifier. */
export interface PromptTemplate {
  template: string;
  source: string;
}

/**
 * Core adapter interface. Every observability provider implements this.
 * All methods must never throw -- failures are logged internally as warnings.
 */
export interface ObservabilityAdapter {
  readonly name: string;
  readonly enabled: boolean;

  getPrompt(): Promise<PromptTemplate | null>;
  createTrace(options: CreateTraceOptions): Promise<TraceHandle | null>;
  logRetrieval(options: LogRetrievalOptions): Promise<void>;
  logGeneration(options: LogGenerationOptions): Promise<void>;
  logEvent(options: LogEventOptions): Promise<void>;
  updateTrace(options: UpdateTraceOptions): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}
