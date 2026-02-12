/**
 * OpenAI tool call structure
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Arguments for collect_contact_information tool
 */
export interface CollectContactArgs {
  contact_value: string;
  user_message?: string;
}

/**
 * Contact collection metadata
 */
export interface ContactCollectionMetadata {
  contactCollected: {
    type: 'phone' | 'email';
    value: string;
  };
}

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
export interface ToolResult<TMetadata = Record<string, unknown>> {
  answer: string;
  metadata?: TMetadata;
}

/**
 * Interface that all tool handlers must implement
 */
export interface IToolHandler<TArgs = unknown, TMetadata = Record<string, unknown>> {
  /**
   * The OpenAI function name this handler responds to
   */
  readonly name: string;

  /**
   * Execute the tool with given arguments and context
   */
  handle(args: TArgs, context: ToolExecutionContext): Promise<ToolResult<TMetadata>>;
}
