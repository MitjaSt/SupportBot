import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  IToolHandler,
  ToolExecutionContext,
  ToolResult,
} from '../interfaces/tool-handler.interface';

/**
 * Service that manages tool handler registration and execution
 */
@Injectable()
export class ToolHandlerService implements OnModuleInit {
  private readonly logger = new Logger(ToolHandlerService.name);
  private readonly handlers = new Map<string, IToolHandler>();

  constructor(private readonly toolHandlers: IToolHandler[]) {}

  onModuleInit() {
    // Register all injected handlers
    for (const handler of this.toolHandlers) {
      this.register(handler);
    }

    this.logger.log(`Registered ${this.handlers.size} tool handlers`);
  }

  /**
   * Register a tool handler
   */
  register(handler: IToolHandler): void {
    if (this.handlers.has(handler.name)) {
      this.logger.warn(`Overwriting existing handler for tool: ${handler.name}`);
    }

    this.handlers.set(handler.name, handler);
    this.logger.debug(`Registered tool handler: ${handler.name}`);
  }

  /**
   * Execute a tool call
   */
  async execute(toolCall: any, context: ToolExecutionContext): Promise<ToolResult> {
    const toolName = toolCall.function.name;
    const handler = this.handlers.get(toolName);

    if (!handler) {
      this.logger.error(`No handler registered for tool: ${toolName}`);
      throw new Error(`No handler registered for tool: ${toolName}`);
    }

    this.logger.log(`Executing tool: ${toolName}`);

    try {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await handler.handle(args, context);

      this.logger.log(`Tool execution completed: ${toolName}`);
      return result;
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Tool execution failed: ${toolName}`, errorStack);
      throw error;
    }
  }

  /**
   * Check if a handler exists for a tool
   */
  hasHandler(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  /**
   * Get list of registered tool names
   */
  getRegisteredTools(): string[] {
    return Array.from(this.handlers.keys());
  }
}
