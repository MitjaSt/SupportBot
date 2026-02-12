# Coding Standards

Write code for the next engineer, not the compiler.

## Philosophy

**Readability is correctness.** Code is read 10x more than it's written. Optimize for understanding.

This RAG system handles sensitive medical queries. Code clarity isn't just about maintainability—it's about trust. When debugging a production issue, you need to understand what's happening immediately.

---

## Clean Code

### Names Reveal Intent

**Good:**
```typescript
// ✅ Clear purpose from the name
const needsRewriting = (query: string): boolean => { ... }
const isValidUKPhoneNumber = (phone: string): boolean => { ... }
const embedQuery = async (text: string): Promise<number[]> => { ... }
```

**Bad:**
```typescript
// ❌ Vague, requires reading implementation
const check = (query: string): boolean => { ... }
const validate = (phone: string): boolean => { ... }
const process = async (text: string): Promise<number[]> => { ... }
```

### Functions Do One Thing

If you need "and" to describe it, split it.

**Good:**
```typescript
// ✅ Single responsibility
async embed(text: string): Promise<number[]> {
  const response = await this.openaiClient.embeddings.create({ ... });
  return response.data[0].embedding;
}

// ✅ Separate concerns
async search(query: string): Promise<SearchResult[]> {
  const queryEmbedding = await this.embeddings.embed(query);
  return this.vectorDb.search(queryEmbedding, this.topK);
}
```

**Bad:**
```typescript
// ❌ Does embedding AND searching AND logging
async embedAndSearch(query: string): Promise<SearchResult[]> {
  const response = await this.openaiClient.embeddings.create({ ... });
  const embedding = response.data[0].embedding;
  this.logger.log('Embedded query');
  const results = await this.vectorDb.search(embedding, this.topK);
  this.logger.log('Searched vectors');
  return results;
}
```

### No Side Effects

A function named `validate` shouldn't also modify state.

**Good:**
```typescript
// ✅ Pure validation
private needsRewriting(query: string): boolean {
  const pronouns = /\b(it|this|that)\b/i;
  return pronouns.test(query);
}

// ✅ Separate mutation
async rewriteQuery(query: string, history: Message[]): Promise<string> {
  if (!this.needsRewriting(query)) return query;
  return this.callOpenAIToRewrite(query, history);
}
```

**Bad:**
```typescript
// ❌ Validation that also logs and updates metrics
private needsRewriting(query: string): boolean {
  const result = /\b(it|this|that)\b/i.test(query);
  this.logger.log(`Query needs rewriting: ${result}`);
  this.metrics.queryRewriteChecks.inc();
  return result;
}
```

### Comments Explain Why, Not What

Code tells you what; comments tell you why.

**Good:**
```typescript
// ✅ Explains non-obvious reasoning
// OpenAI streaming doesn't return usage stats by default.
// We must explicitly request them via stream_options.
const stream = await this.openaiClient.chat.completions.create({
  stream: true,
  stream_options: { include_usage: true },
  // ...
});
```

**Bad:**
```typescript
// ❌ Restates the code
// Create a stream
const stream = await this.openaiClient.chat.completions.create({
  stream: true, // enable streaming
  // ...
});
```

---

## TypeScript Standards

### Use Type Inference Where Obvious

**Good:**
```typescript
// ✅ Type is obvious from right-hand side
const sessionId = uuidv4();
const response = await this.chat.chat(sessionId, query);
const messages = data.history;
```

**Bad:**
```typescript
// ❌ Redundant type annotations
const sessionId: string = uuidv4();
const response: QueryResponse = await this.chat.chat(sessionId, query);
const messages: Message[] = data.history;
```

### Explicitly Type Function Signatures

**Good:**
```typescript
// ✅ Clear contract
async embed(text: string): Promise<number[]> { ... }
async search(embedding: number[], limit: number): Promise<SearchResult[]> { ... }
```

**Bad:**
```typescript
// ❌ Inferred return types hide intent
async embed(text: string) { ... }
async search(embedding, limit) { ... }
```

### Use `interface` for Data, `type` for Unions/Intersections

**Good:**
```typescript
// ✅ Interface for object shapes
export interface RagResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
}

// ✅ Type for unions
export type StreamEventType = 'chunk' | 'tool' | 'done';

// ✅ Type for complex compositions
export type MessageRole = (typeof messageRoleEnum.enumValues)[number];
```

### Use Domain Types, Not Primitives

**Good:**
```typescript
// ✅ Domain-specific types
export type SessionId = string;
export type Embedding = number[];
export type CollectionState = 'idle' | 'offering' | 'collecting__user_phone' | 'complete';
```

**Bad:**
```typescript
// ❌ Primitive obsession
function getSession(id: string): Session { ... }
function embed(text: string): number[] { ... }
```

---

## NestJS Standards

### Dependency Injection

Always use constructor injection, never property injection.

**Good:**
```typescript
// ✅ Constructor injection (dependencies clear at a glance)
@Injectable()
export class RagService {
  constructor(
    private readonly config: ConfigService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorDb: VectorDbService,
    private readonly metrics: MetricsService,
  ) {}
}
```

**Bad:**
```typescript
// ❌ Property injection (dependencies hidden)
@Injectable()
export class RagService {
  @Inject(ConfigService)
  private config: ConfigService;

  @Inject(EmbeddingsService)
  private embeddings: EmbeddingsService;
}
```

### Module Organization

Each module exports a service and optionally a controller.

```
modules/
  rag/
    rag.module.ts        # Module definition
    rag.service.ts       # Core business logic
    rag.controller.ts    # HTTP endpoints (if public API)
    services/            # Sub-services for complex logic
      tool-handler.service.ts
    tools.ts             # Tool definitions (OpenAI function calling)
```

### Controller Methods

Controllers handle HTTP concerns only. Delegate business logic to services.

**Good:**
```typescript
// ✅ Controller handles HTTP, service handles logic
@Post('query/stream')
async queryStream(@Body() body: QueryRequest, @Res() reply: FastifyReply) {
  const sessionId = body.sessionId ?? uuidv4();

  // Set SSE headers
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');

  // Delegate to service
  for await (const event of this.chat.chatStream(sessionId, body.query)) {
    reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  reply.raw.end();
}
```

**Bad:**
```typescript
// ❌ Business logic in controller
@Post('query')
async query(@Body() body: QueryRequest) {
  const embedding = await this.openaiClient.embeddings.create({ ... });
  const results = await this.db.query('SELECT ...', [embedding]);
  const answer = await this.openaiClient.chat.completions.create({ ... });
  return { answer, sources: results };
}
```

---

## React Standards

### Functional Components with Hooks

Always use functional components. Class components are legacy.

**Good:**
```typescript
// ✅ Functional component
export function ChatView({ onSessionUpdate }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSession(sessionId);
  }, [sessionId]);

  return <Box>...</Box>;
}
```

### Props Interfaces

Define props interfaces inline or nearby, not in separate files.

**Good:**
```typescript
// ✅ Clear contract
interface ChatViewProps {
  onSessionUpdate: () => void;
}

export function ChatView({ onSessionUpdate }: ChatViewProps) { ... }
```

### State Management

- **Local state** (useState): UI state (loading, error, form values)
- **URL state** (useParams, useSearchParams): Navigation (sessionId, filters)
- **localStorage**: User preferences (voiceEnabled, theme)
- **Server state**: Fetch on mount, don't cache in React state

**Good:**
```typescript
// ✅ Voice preference in localStorage, loaded once
const [voiceEnabled, setVoiceEnabled] = useState(() => {
  const saved = localStorage.getItem('voiceEnabled');
  return saved === 'true';
});

const toggleVoice = () => {
  setVoiceEnabled((prev) => {
    const newValue = !prev;
    localStorage.setItem('voiceEnabled', String(newValue));
    return newValue;
  });
};
```

### Event Handlers

Name event handlers with `handle` prefix or `on` prefix for props.

**Good:**
```typescript
// ✅ Clear naming
const handleSendMessage = async (text: string) => { ... };
const handleVoiceToggle = () => { ... };

<ChatInput onSend={handleSendMessage} onToggleVoice={handleVoiceToggle} />
```

---

## Async/Await Standards

### Always Use Async/Await, Never Raw Promises

**Good:**
```typescript
// ✅ Readable async code
async function chat(sessionId: string, query: string): Promise<RagResponse> {
  const embedding = await this.embeddings.embed(query);
  const results = await this.vectorDb.search(embedding, this.topK);
  const answer = await this.generateAnswer(query, results);
  return { answer, sources: results, model: 'gpt-5.2' };
}
```

**Bad:**
```typescript
// ❌ Promise chains are harder to read
function chat(sessionId: string, query: string): Promise<RagResponse> {
  return this.embeddings.embed(query)
    .then(embedding => this.vectorDb.search(embedding, this.topK))
    .then(results => this.generateAnswer(query, results)
      .then(answer => ({ answer, sources: results, model: 'gpt-5.2' })));
}
```

### Error Handling

Use try-catch for async operations. Let exceptions bubble to error handlers.

**Good:**
```typescript
// ✅ Error handling at appropriate boundary
@Post('query')
async query(@Body() body: QueryRequest): Promise<QueryResponse> {
  try {
    return await this.chat.chat(body.sessionId, body.query);
  } catch (error) {
    this.logger.error(`Chat query failed: ${error.message}`);
    throw new InternalServerErrorException('Failed to process query');
  }
}
```

**Bad:**
```typescript
// ❌ Swallowing errors or returning null
async query(body: QueryRequest): Promise<QueryResponse | null> {
  try {
    return await this.chat.chat(body.sessionId, body.query);
  } catch (error) {
    console.log('Error:', error);
    return null; // Caller has no idea what went wrong
  }
}
```

### Streaming Patterns

Use `AsyncGenerator` for streaming data.

**Good:**
```typescript
// ✅ Type-safe async generator
async *chatStream(sessionId: string, query: string): AsyncGenerator<StreamEvent> {
  const stream = await this.openaiClient.chat.completions.create({
    stream: true,
    // ...
  });

  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.content) {
      yield { type: 'chunk', content: chunk.choices[0].delta.content };
    }
  }

  yield { type: 'done', metadata: { fullContent, sources } };
}
```

---

## Database Standards (Drizzle ORM)

### Schema Definition

Use Drizzle's schema builder. Define custom types when needed (e.g., pgvector).

**Good:**
```typescript
// ✅ Custom type for pgvector
const vector = (name: string, config: { dimensions: number }) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() { return `vector(${config.dimensions})`; },
    toDriver(value: number[]): string { return JSON.stringify(value); },
    fromDriver(value: string): number[] { return JSON.parse(value); },
  })(name);

export const vectors = pgTable('vectors', {
  id: uuid('id').primaryKey().defaultRandom(),
  embedding: vector('embedding', { dimensions: 1536 }).notNull(),
  text: text('text').notNull(),
  source: text('source').notNull(),
});
```

### Type Inference

Use Drizzle's type inference for models.

**Good:**
```typescript
// ✅ Inferred types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Message = typeof messages.$inferSelect;
```

### Queries

Use Drizzle's query builder. Use raw SQL only for pgvector operations.

**Good:**
```typescript
// ✅ Query builder for standard queries
const session = await db.query.sessions.findFirst({
  where: eq(sessions.sessionId, sessionId),
  with: { messages: true },
});

// ✅ Raw SQL for pgvector (no query builder support)
const results = await db.execute(sql`
  SELECT id, text, source,
    1 - (embedding <=> ${embeddingStr}::vector) as score
  FROM vectors
  WHERE 1 - (embedding <=> ${embeddingStr}::vector) >= ${threshold}
  ORDER BY embedding <=> ${embeddingStr}::vector
  LIMIT ${limit}
`);
```

**Bad:**
```typescript
// ❌ Raw SQL for everything
const session = await db.execute(sql`
  SELECT * FROM sessions WHERE session_id = ${sessionId}
`);
```

---

## RAG-Specific Standards

### Prompt Engineering

System prompts live in constants, not scattered in code.

**Good:**
```typescript
// ✅ Centralized system prompt
const SYSTEM_PROMPT = `You are a helpful assistant for the Macular Society helpline.
Answer questions about macular disease based ONLY on the provided context.
If the context doesn't contain relevant information, say:
"I do not have information about that. Can I help you with something else?"

Keep responses concise and suitable for a phone conversation.
Refer to the person as "you" not "the caller".`;

// Used consistently across all LLM calls
const messages = [
  { role: 'system', content: SYSTEM_PROMPT },
  // ...
];
```

**Bad:**
```typescript
// ❌ Inline prompts that drift over time
const messages = [
  { role: 'system', content: 'You are a helpful assistant. Answer questions.' },
  // ...
];
```

### Retrieval Thresholds

Make retrieval parameters configurable, not hardcoded.

**Good:**
```typescript
// ✅ Config-driven
constructor(private readonly config: ConfigService) {
  this.topK = config.rag.topK;               // RAG_TOP_K=2
  this.scoreThreshold = config.rag.scoreThreshold; // RAG_SCORE_THRESHOLD=0.7
}

const results = await this.vectorDb.search(embedding, this.topK, this.scoreThreshold);
```

**Bad:**
```typescript
// ❌ Magic numbers
const results = await this.vectorDb.search(embedding, 2, 0.7);
```

### Token Usage Tracking

Always track token usage and costs for OpenAI calls.

**Good:**
```typescript
// ✅ Metrics on every LLM call
const response = await this.openaiClient.chat.completions.create({ ... });

if (response.usage) {
  this.metrics.tokensInputTotal.inc({ model, endpoint }, response.usage.prompt_tokens);
  this.metrics.tokensOutputTotal.inc({ model, endpoint }, response.usage.completion_tokens);
  this.metrics.recordTokenCost(model, response.usage.prompt_tokens, response.usage.completion_tokens);
}
```

### Streaming Response Handling

For OpenAI streaming, use `stream_options: { include_usage: true }` to get token counts.

**Good:**
```typescript
// ✅ Request usage stats in streaming mode
const stream = await this.openaiClient.chat.completions.create({
  stream: true,
  stream_options: { include_usage: true },
  // ...
});

for await (const chunk of stream) {
  // Stream content chunks
  if (chunk.choices[0]?.delta?.content) {
    yield { type: 'chunk', content: chunk.choices[0].delta.content };
  }

  // Capture usage from final chunk
  if (chunk.usage) {
    this.metrics.tokensTotal.inc({ model }, chunk.usage.total_tokens);
  }
}
```

---

## Testing Standards

### Test Organization

```
projects/api/test/
  unit/                    # Fast, isolated tests
    contact-collection.test.ts
    vector-db.test.ts
  integration/             # Database + API tests
    chat-endpoints.test.ts
  agent-simulations/       # LLM quality tests
    dry-amd.test.ts

projects/frontend/e2e/     # Playwright E2E tests
  tests/
    chat-flow.spec.ts
  fixtures/
    conversations.ts
```

### Unit Tests (Vitest)

Test business logic in isolation. Mock external dependencies.

**Good:**
```typescript
// ✅ Unit test with mocks
describe('RagService.needsRewriting', () => {
  it('returns true for queries with pronouns', () => {
    const service = new RagService(/* mock dependencies */);
    expect(service.needsRewriting('What is it?')).toBe(true);
    expect(service.needsRewriting('How does that work?')).toBe(true);
  });

  it('returns false for self-contained queries', () => {
    const service = new RagService(/* mock dependencies */);
    expect(service.needsRewriting('What is dry AMD?')).toBe(false);
  });
});
```

### Integration Tests

Test full request/response cycles with real database.

**Good:**
```typescript
// ✅ Integration test with test database
describe('POST /chat/query', () => {
  beforeEach(async () => {
    await db.delete(sessions);
    await db.delete(messages);
  });

  it('creates a new session and returns a response', async () => {
    const response = await request(app)
      .post('/chat/query')
      .send({ query: 'What is dry AMD?' });

    expect(response.status).toBe(200);
    expect(response.body.answer).toBeDefined();
    expect(response.body.sessionId).toBeDefined();
  });
});
```

### Agent Simulations (@langwatch/scenario)

Test conversational quality with LLM-as-judge.

**Good:**
```typescript
// ✅ Judge-based quality evaluation
scenario('Dry AMD conversation')
  .given('A user asks about dry AMD')
  .when('The assistant responds')
  .then('The response should mention macular degeneration')
  .and('The response should be concise (under 200 words)')
  .and('The response should not contain hallucinations')
  .judgedBy('gpt-5.2', {
    criteria: {
      relevance: 'Response addresses the question',
      accuracy: 'Information is medically accurate',
      conciseness: 'Response is under 200 words',
    },
  });
```

### E2E Tests (Playwright)

Test user workflows in real browser. Use loose assertions for LLM responses.

**Good:**
```typescript
// ✅ Loose assertions for non-deterministic LLM output
test('User can ask a question and get a response', async ({ page }) => {
  await page.goto('/');
  await page.fill('textarea', 'What is dry AMD?');
  await page.click('button:has-text("Send")');

  await page.waitForSelector('[role="progressbar"]', { state: 'hidden' });

  const response = await page.locator('.assistant-message').last().innerText();

  // Assert structure, not exact text
  expect(response.length).toBeGreaterThan(50);
  expect(response.toLowerCase()).toMatch(/macular|vision|retina|drusen/);
  expect(response).not.toContain('I do not have information about that');
});
```

---

## SOLID Principles

| Principle | One-liner | Example |
|-----------|-----------|---------|
| **S**ingle Responsibility | One reason to change | `EmbeddingsService` only handles embeddings, not retrieval |
| **O**pen/Closed | Extend behavior without modifying code | Add new tool to `RAG_TOOLS` array without changing `RagService` |
| **L**iskov Substitution | Subtypes substitutable for base types | Any `VectorDbService` implementation works |
| **I**nterface Segregation | Don't force unused methods | `ChatService` exposes `chat()` and `chatStream()`, not a single method with a `stream` flag |
| **D**ependency Inversion | Depend on abstractions | Services depend on injected interfaces, not concrete classes |

---

## CUPID Properties

Properties that make code joyful to work with:

| Property | One-liner | Example |
|----------|-----------|---------|
| **C**omposable | Small API, minimal deps | `EmbeddingsService.embed()` takes text, returns vector. No side effects. |
| **U**nix philosophy | Does one thing well | `WhisperService.transcribe()` only transcribes. Doesn't process the query. |
| **P**redictable | Behaves as expected | `needsRewriting()` is pure. Same input = same output. |
| **I**diomatic | Feels natural in language/framework | Uses NestJS decorators (`@Injectable`, `@Post`) idiomatically |
| **D**omain-based | Mirrors business domain | Modules map to domain concepts (RAG, Chat, VectorDb, not GenericService) |

---

## Code Smells

Stop and refactor when you see:

### Long Parameter Lists

**Bad:**
```typescript
// ❌ 6 parameters
function search(query: string, topK: number, threshold: number, sessionId: string, userId: string, metadata: any) { ... }
```

**Good:**
```typescript
// ✅ Group into object
interface SearchOptions {
  query: string;
  topK: number;
  threshold: number;
  sessionId: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

function search(options: SearchOptions) { ... }
```

### Feature Envy

**Bad:**
```typescript
// ❌ ChatController using RagService's internals
@Post('query')
async query(@Body() body: QueryRequest) {
  const embedding = await this.rag.embeddings.embed(body.query);
  const results = await this.rag.vectorDb.search(embedding);
  return { results };
}
```

**Good:**
```typescript
// ✅ Delegate to RagService
@Post('query')
async query(@Body() body: QueryRequest) {
  return this.rag.search(body.query);
}
```

### Primitive Obsession

**Bad:**
```typescript
// ❌ Passing raw strings everywhere
function getSession(id: string): Session { ... }
function embed(text: string): number[] { ... }
```

**Good:**
```typescript
// ✅ Domain types
type SessionId = string;
type Embedding = number[];

function getSession(id: SessionId): Session { ... }
function embed(text: string): Embedding { ... }
```

### Shotgun Surgery

If one requirement change requires editing 5+ files, your concerns aren't properly separated.

**Example:** Changing the system prompt shouldn't require editing `RagService`, `ChatService`, `QueryController`, and test files. It should be in one constant.

### Duplicate Code

Three occurrences is the threshold for extraction.

**Bad:**
```typescript
// ❌ Duplicated error handling
try {
  await this.openaiClient.chat.completions.create({ ... });
} catch (error) {
  this.logger.error(`OpenAI call failed: ${error.message}`);
  this.metrics.openaiErrors.inc();
  throw new InternalServerErrorException('LLM request failed');
}

// Same block in 3 other methods...
```

**Good:**
```typescript
// ✅ Extract to helper
private async callOpenAI<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    this.logger.error(`OpenAI call failed: ${error.message}`);
    this.metrics.openaiErrors.inc();
    throw new InternalServerErrorException('LLM request failed');
  }
}
```

---

## The Boy Scout Rule

Leave the code cleaner than you found it. Small improvements compound.

**Examples:**
- Fix a typo in a comment while changing nearby code
- Extract a magic number to a named constant
- Add a type annotation to an `any`
- Split a 50-line function into 3 focused functions
- Update an outdated comment

---

## When in Doubt

Before committing, ask yourself:

1. **Can a new team member understand this in 30 seconds?**
   - If not: simplify or add comments

2. **Will this be obvious in 6 months?**
   - If not: document the why

3. **Does this make the codebase simpler or more complex?**
   - If more complex: is the complexity justified?

4. **Is this tested?**
   - Unit tests for logic
   - Integration tests for APIs
   - E2E tests for user flows

5. **Does this handle errors gracefully?**
   - Never swallow exceptions silently
   - Log errors with context
   - Return meaningful error messages to users

---

## Anti-Patterns to Avoid

### Over-Engineering

Don't build for hypothetical future requirements.

**Bad:**
```typescript
// ❌ Building a generic LLM abstraction for one provider
interface LLMProvider {
  embed(text: string): Promise<Embedding>;
  chat(messages: Message[]): Promise<string>;
  stream(messages: Message[]): AsyncGenerator<string>;
}

class OpenAIProvider implements LLMProvider { ... }
class AnthropicProvider implements LLMProvider { ... }
class GeminiProvider implements LLMProvider { ... }
```

**Good:**
```typescript
// ✅ Use OpenAI directly until you actually need another provider
constructor(private readonly openaiClient: OpenAI) {}

async embed(text: string): Promise<number[]> {
  const response = await this.openaiClient.embeddings.create({ ... });
  return response.data[0].embedding;
}
```

### Premature Optimization

Optimize after measuring, not before.

**Bad:**
```typescript
// ❌ Caching everything "just in case"
private sessionCache = new Map<string, Session>();
private embeddingCache = new Map<string, number[]>();
private responseCache = new Map<string, string>();
```

**Good:**
```typescript
// ✅ Measure first, then optimize hot paths
// Run profiler, identify bottlenecks, add caching where measured impact exists
```

### Magic Strings

**Bad:**
```typescript
// ❌ Literal strings everywhere
if (message.role === 'user') { ... }
if (state === 'collecting__user_phone') { ... }
```

**Good:**
```typescript
// ✅ Use enums or constants
if (message.role === 'user') { ... } // 'user' is from messageRoleEnum
if (state === 'collecting__user_phone') { ... } // from collectionStateEnum
```

---

## File Naming Conventions

```
kebab-case for files:
  rag.service.ts
  chat.controller.ts
  tool-handler.service.ts

PascalCase for classes:
  class RagService
  class ChatController
  class ToolHandlerService

camelCase for functions/variables:
  async chatStream()
  const sessionId = uuidv4()

UPPER_SNAKE_CASE for constants:
  const SYSTEM_PROMPT = '...'
  const RAG_TOOLS = [...]
```

---

## Commit Message Guidelines

Follow Conventional Commits:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructure without behavior change
- `test`: Adding/updating tests
- `docs`: Documentation updates
- `chore`: Maintenance (deps, config)
- `perf`: Performance improvements

**Examples:**
```
feat: add voice toggle to chat interface

Add VolumeUp/VolumeOff toggle button that saves preference
to localStorage and persists across page reloads.

Closes #42
```

```
fix: track token usage in streaming responses

OpenAI streaming API doesn't include usage stats by default.
Added stream_options: { include_usage: true } to capture
token counts in the final chunk.
```

---

## Resources

- **NestJS Docs**: https://docs.nestjs.com
- **Drizzle ORM Docs**: https://orm.drizzle.team
- **OpenAI API Reference**: https://platform.openai.com/docs
- **Playwright Docs**: https://playwright.dev
- **Clean Code (Book)**: Robert C. Martin
- **CUPID Properties**: Dan North

---

**Remember:** Standards exist to make us faster and safer. If a standard gets in the way, discuss it with the team. Don't break it silently.
