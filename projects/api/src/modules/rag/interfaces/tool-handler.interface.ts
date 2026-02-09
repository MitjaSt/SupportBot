/**
 * Context passed to tool handlers during execution
 */
export interface ToolExecutionContext {
  query: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?: string;
  chunks: Array<{ text: string; source: string; score: number }>;
  model: string;
  backend: string;
}

/**
 * Result returned by tool handlers
 */
export interface ToolResult {
  answer: string;
  metadata?: Record<string, any>;
}

/**
 * Interface that all tool handlers must implement
 */
export interface IToolHandler {
  /**
   * The OpenAI function name this handler responds to
   */
  readonly name: string;

  /**
   * Execute the tool with given arguments and context
   */
  handle(args: any, context: ToolExecutionContext): Promise<ToolResult>;
}
