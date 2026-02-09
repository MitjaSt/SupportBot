# RAG Module - Tool Handler Pattern

## Overview

The RAG module uses a **Tool Handler Registry pattern** to manage OpenAI function calling tools. This pattern separates concerns and makes it easy to add new tools without modifying the core RAG service.

## Architecture

```
RagService
    ↓
ToolHandlerService (registry)
    ↓
ContactCollectionToolHandler (implements IToolHandler)
```

### Key Components

1. **IToolHandler** - Interface that all tool handlers must implement
2. **ToolHandlerService** - Registry that manages and executes tool handlers
3. **Individual Handlers** - Each tool gets its own handler class (e.g., `ContactCollectionToolHandler`)

## How It Works

### 1. Tool Handler Interface

All tool handlers implement the `IToolHandler` interface:

```typescript
export interface IToolHandler {
  readonly name: string; // OpenAI function name
  handle(args: any, context: ToolExecutionContext): Promise<ToolResult>;
}
```

### 2. Tool Execution Flow

1. OpenAI returns a tool call in the chat completion
2. RAG service passes the tool call to `ToolHandlerService`
3. `ToolHandlerService` looks up the appropriate handler by name
4. Handler executes and returns a `ToolResult`
5. RAG service returns the result to the user

### 3. Automatic Registration

Tool handlers are automatically registered on module initialization:

```typescript
@Module({
  providers: [
    ContactCollectionToolHandler,
    {
      provide: ToolHandlerService,
      useFactory: (...handlers: IToolHandler[]) => {
        return new ToolHandlerService(handlers);
      },
      inject: [ContactCollectionToolHandler],
    },
    RagService,
  ],
})
export class RagModule {}
```

## Adding a New Tool Handler

### Step 1: Define the OpenAI Tool

Add your tool definition to `tools.ts`:

```typescript
export const RAG_TOOLS: OpenAI.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'my_new_tool',
      description: 'Description of what this tool does',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'First parameter' },
        },
        required: ['param1'],
      },
    },
  },
  // ... other tools
];
```

### Step 2: Create the Handler

Create a new handler in `handlers/my-tool.handler.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import {
  IToolHandler,
  ToolExecutionContext,
  ToolResult,
} from '../interfaces/tool-handler.interface';

@Injectable()
export class MyToolHandler implements IToolHandler {
  readonly name = 'my_new_tool';
  private readonly logger = new Logger(MyToolHandler.name);

  async handle(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    const { param1 } = args;

    this.logger.log(`Executing my_new_tool with param1: ${param1}`);

    // Your tool logic here
    const result = await this.doSomething(param1);

    return {
      answer: `Tool completed: ${result}`,
      metadata: {
        customData: result,
      },
    };
  }

  private async doSomething(param: string): Promise<string> {
    // Implementation
    return `Processed: ${param}`;
  }
}
```

### Step 3: Register the Handler

Update `rag.module.ts`:

```typescript
import { MyToolHandler } from './handlers/my-tool.handler';

@Module({
  providers: [
    ContactCollectionToolHandler,
    MyToolHandler, // Add your handler here
    {
      provide: ToolHandlerService,
      useFactory: (...handlers: IToolHandler[]) => {
        return new ToolHandlerService(handlers);
      },
      inject: [
        ContactCollectionToolHandler,
        MyToolHandler, // Add to inject array
      ],
    },
    RagService,
  ],
})
export class RagModule {}
```

### Step 4: Test Your Handler

Create a test file `test/unit/my-tool.handler.test.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { MyToolHandler } from '@/modules/rag/handlers/my-tool.handler';

describe('MyToolHandler', () => {
  let handler: MyToolHandler;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyToolHandler],
    }).compile();

    handler = module.get(MyToolHandler);
  });

  it('should handle tool call', async () => {
    const result = await handler.handle(
      { param1: 'test' },
      {
        query: 'user query',
        chunks: [],
        model: 'gpt-4o',
        backend: 'openai',
      },
    );

    expect(result.answer).toContain('Tool completed');
  });
});
```

## Benefits of This Pattern

### Separation of Concerns
- RAG service focuses on retrieval and response generation
- Each tool handler focuses on its specific functionality
- No god-like classes with too many responsibilities

### Extensibility
- Add new tools without modifying RAG service
- Each handler is independent and testable
- Easy to maintain and debug

### Testability
- Test handlers in isolation
- Mock dependencies easily
- Clear input/output contracts

### Type Safety
- Strongly typed interfaces
- Compile-time checks for handler registration
- Context and result types are well-defined

## Example: Contact Collection Handler

See `handlers/contact-collection.handler.ts` for a complete example that:
- Validates phone numbers and emails
- Saves conversation history
- Returns appropriate success/error messages
- Includes proper logging

## Tool Execution Context

The `ToolExecutionContext` provides handlers with everything they need:

```typescript
interface ToolExecutionContext {
  query: string;                      // User's original query
  conversationHistory?: Array<...>;   // Previous messages
  sessionId?: string;                 // Session identifier
  chunks: SearchResult[];             // Retrieved context chunks
  model: string;                      // LLM model name
  backend: string;                    // Backend type (e.g., 'openai')
}
```

## Tool Result

Handlers return a `ToolResult` with:

```typescript
interface ToolResult {
  answer: string;              // Response to send to user
  metadata?: Record<string, any>; // Optional metadata (merged into API response)
}
```

The metadata is spread into the final RAG response, allowing handlers to add custom fields like `contactCollected`.

## Debugging

Enable debug logging to see tool execution:

```typescript
this.logger.debug(`Executing tool: ${toolName}`);
```

Check registered tools at runtime:

```typescript
const tools = toolHandlerService.getRegisteredTools();
console.log('Available tools:', tools);
```
