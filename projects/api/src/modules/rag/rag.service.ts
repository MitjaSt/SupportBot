import { ConfigService } from '@/config/config.service';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { MetricsService } from '../metrics/metrics.service';
import { ObservabilityService } from '../observability/observability.service';
import { PromptLoggerService } from '../prompt-logger/prompt-logger.service';
import { SearchResult, VectorDbService } from '../vector-db/vector-db.service';
import { ToolHandlerService } from './services/tool-handler.service';
import { RAG_TOOLS, TOOL_USAGE_INSTRUCTIONS } from './tools';

export interface RagResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
  backend: 'openai';
  fullPrompt?: string;
  contactCollected?: {
    type: 'phone' | 'email';
    value: string;
  };
}

export interface StreamEvent {
  type: 'chunk' | 'tool' | 'done';
  content?: string;
  metadata?: {
    sources?: SearchResult[];
    model?: string;
    backend?: string;
    fullContent?: string;
    fullPrompt?: string;
    contactCollected?: {
      type: 'phone' | 'email';
      value: string;
    };
  };
}

// System prompt matching Python implementation
const SYSTEM_PROMPT = `You are a helpful assistant for the Macular Society helpline.
Answer questions about macular disease based ONLY on the provided context.
If the context doesn't contain relevant information, say:
"I do not have information about that. Can I help you with something else?"

Keep responses concise and suitable for a phone conversation.
Refer to the person as "you" not "the caller".

${TOOL_USAGE_INSTRUCTIONS}`;

// Query rewriting prompt for making follow-up questions self-contained
const QUERY_REWRITE_PROMPT = `You are a query rewriting assistant. Given a conversation history and a user's follow-up question, rewrite the question to be self-contained and include necessary context from the conversation.

Rules:
1. If the question contains pronouns (it, this, that, they, them, etc.), replace them with specific nouns from the conversation
2. If the question contains vague references like "those treatments", "that procedure", "these injections", etc., replace them with the exact medical terms mentioned in the assistant's most recent response
3. Pay special attention to the assistant's last response - extract specific medical terms, treatments, conditions, or procedures mentioned there
4. If the question references previous topics implicitly, make the reference explicit
5. If the question is already self-contained, return it unchanged
6. Keep the rewritten question concise and natural
7. Maintain the original question's intent

Examples:
History: "What is dry AMD?"
Question: "What causes it?"
Rewritten: "What causes dry AMD?"

History: "Tell me about wet macular degeneration"
Question: "How is it treated?"
Rewritten: "How is wet macular degeneration treated?"

History: "What are the symptoms of age-related macular degeneration?"
Question: "Is there a cure?"
Rewritten: "Is there a cure for age-related macular degeneration?"

History:
User: What are treatments?
Assistant: Treatment typically involves anti-VEGF injections into the eye to stop the growth of abnormal blood vessels.
Question: "Where can I get those injections?"
Rewritten: "Where can I get anti-VEGF injections?"

History:
User: How is wet AMD treated?
Assistant: The main treatment is photodynamic therapy (PDT) which uses a light-activated drug.
Question: "How does that therapy work?"
Rewritten: "How does photodynamic therapy (PDT) work?"`;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly openaiClient: OpenAI;
  private readonly topK: number;
  private readonly scoreThreshold: number;
  private readonly maxTokens: number;

  constructor(
    private readonly config: ConfigService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorDb: VectorDbService,
    private readonly promptLogger: PromptLoggerService,
    private readonly observability: ObservabilityService,
    private readonly toolHandler: ToolHandlerService,
    private readonly metrics: MetricsService,
  ) {
    this.openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout * 1000,
    });
    this.topK = config.rag.topK;
    this.scoreThreshold = config.rag.scoreThreshold;
    this.maxTokens = config.rag.maxTokens;
  }

  /**
   * Check if a query needs rewriting (contains pronouns or unclear references)
   */
  private needsRewriting(query: string): boolean {
    const lowerQuery = query.toLowerCase();

    // Check for pronouns that likely reference previous context
    const pronouns = /\b(it|this|that|they|them|these|those|he|she|his|her|their)\b/i;

    // Check for questions about pronouns
    const questionsAboutPronouns = /\b(what|how|why|when|where|who)\s+(about|is|are|does|do|can|will)\s+(it|this|that|they|them|he|she)\b/i;

    // Check for follow-up indicators
    const followUpIndicators = /\b(also|too|as well|and what about|what else|more|another)\b/i;

    return pronouns.test(query) || questionsAboutPronouns.test(query) || followUpIndicators.test(lowerQuery);
  }

  /**
   * Rewrite a query to be self-contained using conversation history
   */
  private async rewriteQuery(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    // Skip if no history or query doesn't need rewriting
    if (!conversationHistory?.length || !this.needsRewriting(query)) {
      return query;
    }

    // Only use last 3 conversation turns to minimize tokens
    const recentHistory = conversationHistory.slice(-3);
    const historyText = recentHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    try {
      const apiTimer = this.metrics.openaiApiDuration.startTimer({ operation: 'query_rewrite', model: 'gpt-4o-mini' });
      this.metrics.openaiApiCalls.inc({ operation: 'query_rewrite', model: 'gpt-4o-mini' });

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini', // Cheaper model is sufficient for rewriting
        messages: [
          {
            role: 'system',
            content: QUERY_REWRITE_PROMPT,
          },
          {
            role: 'user',
            content: `Conversation history:\n${historyText}\n\nCurrent question: ${query}\n\nRewritten question:`,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      apiTimer();

      // Record token usage
      if (response.usage) {
        const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
        this.metrics.tokensInputTotal.inc({ model: 'gpt-4o-mini', endpoint: 'query_rewrite' }, prompt_tokens);
        this.metrics.tokensOutputTotal.inc({ model: 'gpt-4o-mini', endpoint: 'query_rewrite' }, completion_tokens);
        this.metrics.tokensTotal.inc({ model: 'gpt-4o-mini', endpoint: 'query_rewrite' }, total_tokens);
        this.metrics.tokensPerRequest.observe({ type: 'input', model: 'gpt-4o-mini' }, prompt_tokens);
        this.metrics.tokensPerRequest.observe({ type: 'output', model: 'gpt-4o-mini' }, completion_tokens);
        this.metrics.recordTokenCost('gpt-4o-mini', prompt_tokens, completion_tokens);
      }

      const rewritten = response.choices[0]?.message?.content?.trim();
      return rewritten || query;
    } catch (error) {
      this.logger.warn(`Query rewriting failed, using original: ${error}`);
      return query;
    }
  }

  async retrieve(query: string): Promise<SearchResult[]> {
    const retrievalTimer = this.metrics.ragRetrievalDuration.startTimer();

    const queryVector = await this.embeddings.embed(query);

    const results = await this.vectorDb.search(
      queryVector,
      this.topK,
      this.scoreThreshold,
    );

    retrievalTimer();

    // Record metrics
    this.metrics.ragChunksRetrieved.observe(results.length);
    results.forEach(result => {
      this.metrics.ragRetrievalScore.observe(result.score);
    });

    if (results.length === 0) {
      this.metrics.ragFailedRetrievals.inc();
    }

    return results;
  }

  async generateAnswer(
    query: string,
    chunks: SearchResult[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string = SYSTEM_PROMPT,
    sessionId?: string,
  ): Promise<RagResponse> {
    // Build context from chunks
    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.text}`)
      .join('\n\n');

    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if provided
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add context and query
    const userMessage = context
      ? `Context:\n${context}\n\nQuestion: ${query}`
      : query;

    messages.push({ role: 'user', content: userMessage });

    // Generate response with tool calling support
    const apiTimer = this.metrics.openaiApiDuration.startTimer({ operation: 'chat', model: this.config.openai.chatModel });
    this.metrics.openaiApiCalls.inc({ operation: 'chat', model: this.config.openai.chatModel });

    const response = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.7,
      tools: RAG_TOOLS,
      tool_choice: 'auto',
    });

    apiTimer();

    const choice = response.choices[0];
    const message = choice?.message;

    // Record token usage
    if (response.usage) {
      const { prompt_tokens, completion_tokens, total_tokens } = response.usage;
      this.metrics.tokensInputTotal.inc({ model: this.config.openai.chatModel, endpoint: 'chat' }, prompt_tokens);
      this.metrics.tokensOutputTotal.inc({ model: this.config.openai.chatModel, endpoint: 'chat' }, completion_tokens);
      this.metrics.tokensTotal.inc({ model: this.config.openai.chatModel, endpoint: 'chat' }, total_tokens);
      this.metrics.tokensPerRequest.observe({ type: 'input', model: this.config.openai.chatModel }, prompt_tokens);
      this.metrics.tokensPerRequest.observe({ type: 'output', model: this.config.openai.chatModel }, completion_tokens);
      this.metrics.recordTokenCost(this.config.openai.chatModel, prompt_tokens, completion_tokens);
    }

    // Handle tool calls
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];

      // Delegate to tool handler service
      const toolResult = await this.toolHandler.execute(toolCall, {
        query,
        conversationHistory,
        sessionId,
        chunks,
        model: this.config.openai.chatModel,
        backend: 'openai',
      });

      return {
        answer: toolResult.answer,
        sources: chunks,
        model: this.config.openai.chatModel,
        backend: 'openai',
        ...toolResult.metadata,
      };
    }

    // No tool calls - return regular response
    return {
      answer: message?.content ?? '',
      sources: chunks,
      model: this.config.openai.chatModel,
      backend: 'openai',
    };
  }

  /**
   * Generate streaming answer using OpenAI chat completions with streaming enabled
   * Returns an async generator that yields text chunks
   */
  async *generateAnswerStream(
    query: string,
    chunks: SearchResult[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string = SYSTEM_PROMPT,
    sessionId?: string,
  ): AsyncGenerator<StreamEvent> {
    // Build context from chunks
    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.text}`)
      .join('\n\n');

    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if provided
    if (conversationHistory) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add context and query
    const userMessage = context
      ? `Context:\n${context}\n\nQuestion: ${query}`
      : query;

    messages.push({ role: 'user', content: userMessage });

    // Generate streaming response with tool calling support
    const apiTimer = this.metrics.openaiApiDuration.startTimer({ operation: 'chat_stream', model: this.config.openai.chatModel });
    this.metrics.openaiApiCalls.inc({ operation: 'chat_stream', model: this.config.openai.chatModel });

    const stream = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.7,
      tools: RAG_TOOLS,
      tool_choice: 'auto',
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullContent = '';
    const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];

    // Stream the response
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      // Handle text content
      if (delta?.content) {
        fullContent += delta.content;
        yield { type: 'chunk', content: delta.content };
      }

      // Collect tool calls if present
      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (!toolCalls[toolCall.index]) {
            toolCalls[toolCall.index] = {
              id: toolCall.id ?? '',
              type: 'function',
              function: { name: toolCall.function?.name ?? '', arguments: '' },
            };
          }
          if (toolCall.function?.arguments) {
            toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
          }
        }
      }

      // Capture token usage from final chunk
      if (chunk.usage) {
        const { prompt_tokens, completion_tokens, total_tokens } = chunk.usage;
        this.metrics.tokensInputTotal.inc({ model: this.config.openai.chatModel, endpoint: 'chat_stream' }, prompt_tokens);
        this.metrics.tokensOutputTotal.inc({ model: this.config.openai.chatModel, endpoint: 'chat_stream' }, completion_tokens);
        this.metrics.tokensTotal.inc({ model: this.config.openai.chatModel, endpoint: 'chat_stream' }, total_tokens);
        this.metrics.tokensPerRequest.observe({ type: 'input', model: this.config.openai.chatModel }, prompt_tokens);
        this.metrics.tokensPerRequest.observe({ type: 'output', model: this.config.openai.chatModel }, completion_tokens);
        this.metrics.recordTokenCost(this.config.openai.chatModel, prompt_tokens, completion_tokens);
      }
    }

    apiTimer();

    // Handle tool calls after streaming completes
    if (toolCalls.length > 0) {
      const toolCall = toolCalls[0];

      // Delegate to tool handler service
      const toolResult = await this.toolHandler.execute(toolCall, {
        query,
        conversationHistory,
        sessionId,
        chunks,
        model: this.config.openai.chatModel,
        backend: 'openai',
      });

      yield {
        type: 'tool',
        content: toolResult.answer,
        metadata: toolResult.metadata,
      };
    }

    // Send done signal with metadata
    yield {
      type: 'done',
      metadata: {
        sources: chunks,
        model: this.config.openai.chatModel,
        backend: 'openai',
        fullContent: fullContent || undefined,
      },
    };
  }

  private buildFullPrompt(
    query: string,
    chunks: SearchResult[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string = SYSTEM_PROMPT,
  ): string {
    const parts = [`INSTRUCTIONS:\n${systemPrompt}`];

    if (conversationHistory?.length) {
      const history = conversationHistory.map((m) => `${m.role}: ${m.content}`).join('\n');
      parts.push(`CONVERSATION HISTORY:\n${history}`);
    }

    if (chunks.length > 0) {
      const context = chunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
      parts.push(`RETRIEVED CONTEXT:\n${context}`);
    }

    parts.push(`Question: ${query}`);
    return parts.join('\n\n');
  }

  async query(
    query: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    sessionId?: string,
  ): Promise<RagResponse> {
    const startTime = Date.now();
    this.metrics.ragQueriesTotal.inc({ status: 'started' });

    // Create observability trace
    const trace = await this.observability.createTrace({
      name: 'rag_query',
      sessionId,
      input: query,
      metadata: {
        top_k: this.topK,
        score_threshold: this.scoreThreshold,
        backend: 'openai',
      },
      tags: ['rag', 'api'],
    });

    // Query rewriting phase (if needed)
    const rewrittenQuery = await this.rewriteQuery(query, conversationHistory || []);

    // Log if query was rewritten
    if (rewrittenQuery !== query) {
      this.logger.log(`Query rewritten: "${query}" -> "${rewrittenQuery}"`);
    } else {
      this.logger.debug(`Query used as-is: "${query}"`);
    }

    // Retrieval phase (timed) - use rewritten query for retrieval
    const retrievalStart = Date.now();
    const chunks = await this.retrieve(rewrittenQuery);
    const retrievalDurationMs = Date.now() - retrievalStart;

    if (trace) {
      this.observability
        .logRetrieval({
          trace,
          query: rewrittenQuery, // Log the rewritten query used for retrieval
          chunks: chunks.map((c) => c.text),
          scores: chunks.map((c) => c.score),
          documentIds: chunks.map((c) => c.id),
          model: this.config.embedding.model,
          durationMs: retrievalDurationMs,
          metadata: rewrittenQuery !== query ? { original_query: query, rewritten: true } : {},
        })
        .catch((err) => this.logger.warn(`Observability logRetrieval failed: ${err}`));
    }

    // Fetch prompt from observability adapter (LangFuse/LangWatch) or fall back to default
    const conversationHistoryStr =
      conversationHistory?.map((m) => `${m.role}: ${m.content}`).join('\n') ?? '';
    let systemPrompt = SYSTEM_PROMPT;
    try {
      const fetchedPrompt = await this.observability.getPrompt(
        chunks.map((c) => c.text),
        conversationHistoryStr,
      );
      if (fetchedPrompt) {
        systemPrompt = fetchedPrompt;
        // TODO: Add information about which adaptor it is
        this.logger.debug('Using prompt from observability adapter');
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch prompt from observability, using default: ${e}`);
    }

    // Generation phase (timed)
    const generationStart = Date.now();
    const result = await this.generateAnswer(query, chunks, conversationHistory, systemPrompt, sessionId);
    const generationDurationMs = Date.now() - generationStart;

    const fullPrompt = this.buildFullPrompt(query, chunks, conversationHistory, systemPrompt);

    if (trace) {
      this.observability
        .logGeneration({
          trace,
          model: result.model,
          prompt: fullPrompt,
          response: result.answer,
          durationMs: generationDurationMs,
        })
        .catch((err) => this.logger.warn(`Observability logGeneration failed: ${err}`));

      this.observability
        .updateTrace({
          trace,
          output: result.answer,
          metadata: {
            total_duration_ms: Date.now() - startTime,
            chunks_count: chunks.length,
            model: result.model,
            backend: result.backend,
          },
        })
        .catch((err) => this.logger.warn(`Observability updateTrace failed: ${err}`));

      this.observability
        .flush()
        .catch((err) => this.logger.warn(`Observability flush failed: ${err}`));
    }

    // Fire-and-forget: log the prompt/response as YAML
    const endTime = new Date();
    const logEntry = this.promptLogger.buildLogEntry({
      startTime: new Date(startTime),
      endTime,
      model: result.model,
      prompt: fullPrompt,
      chunks: chunks.map((c) => c.text),
      query,
      response: result.answer,
    });
    this.promptLogger
      .log(logEntry)
      .catch((err) => this.logger.error('Failed to write prompt log:', err));

    this.metrics.ragQueriesTotal.inc({ status: 'success' });

    return { ...result, fullPrompt };
  }

  /**
   * Streaming version of query() that yields text chunks as they're generated
   */
  async *queryStream(
    query: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    sessionId?: string,
  ): AsyncGenerator<StreamEvent> {
    const startTime = Date.now();

    // Create observability trace
    const trace = await this.observability.createTrace({
      name: 'rag_query_stream',
      sessionId,
      input: query,
      metadata: {
        top_k: this.topK,
        score_threshold: this.scoreThreshold,
        backend: 'openai',
        streaming: true,
      },
      tags: ['rag', 'api', 'streaming'],
    });

    // Query rewriting phase (if needed)
    const rewrittenQuery = await this.rewriteQuery(query, conversationHistory || []);

    // Log if query was rewritten
    if (rewrittenQuery !== query) {
      this.logger.log(`Query rewritten: "${query}" -> "${rewrittenQuery}"`);
    } else {
      this.logger.debug(`Query used as-is: "${query}"`);
    }

    // Retrieval phase (timed) - use rewritten query for retrieval
    const retrievalStart = Date.now();
    const chunks = await this.retrieve(rewrittenQuery);
    const retrievalDurationMs = Date.now() - retrievalStart;

    if (trace) {
      this.observability
        .logRetrieval({
          trace,
          query: rewrittenQuery,
          chunks: chunks.map((c) => c.text),
          scores: chunks.map((c) => c.score),
          documentIds: chunks.map((c) => c.id),
          model: this.config.embedding.model,
          durationMs: retrievalDurationMs,
          metadata: rewrittenQuery !== query ? { original_query: query, rewritten: true } : {},
        })
        .catch((err) => this.logger.warn(`Observability logRetrieval failed: ${err}`));
    }

    // Fetch prompt from observability adapter
    const conversationHistoryStr =
      conversationHistory?.map((m) => `${m.role}: ${m.content}`).join('\n') ?? '';
    let systemPrompt = SYSTEM_PROMPT;
    try {
      const fetchedPrompt = await this.observability.getPrompt(
        chunks.map((c) => c.text),
        conversationHistoryStr,
      );
      if (fetchedPrompt) {
        systemPrompt = fetchedPrompt;
        this.logger.debug('Using prompt from observability adapter');
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch prompt from observability, using default: ${e}`);
    }

    // Generation phase (streaming)
    const generationStart = Date.now();
    let fullAnswer = '';
    const fullPrompt = this.buildFullPrompt(query, chunks, conversationHistory, systemPrompt);

    // Stream the response
    for await (const event of this.generateAnswerStream(query, chunks, conversationHistory, systemPrompt, sessionId)) {
      if (event.type === 'chunk' && event.content) {
        fullAnswer += event.content;
      }
      if (event.type === 'done') {
        yield { ...event, metadata: { ...event.metadata, fullPrompt } };
      } else {
        yield event;
      }
    }

    const generationDurationMs = Date.now() - generationStart;

    // Log to observability (fire-and-forget)
    if (trace) {
      this.observability
        .logGeneration({
          trace,
          model: this.config.openai.chatModel,
          prompt: fullPrompt,
          response: fullAnswer,
          durationMs: generationDurationMs,
        })
        .catch((err) => this.logger.warn(`Observability logGeneration failed: ${err}`));

      this.observability
        .updateTrace({
          trace,
          output: fullAnswer,
          metadata: {
            total_duration_ms: Date.now() - startTime,
            chunks_count: chunks.length,
            model: this.config.openai.chatModel,
            backend: 'openai',
            streaming: true,
          },
        })
        .catch((err) => this.logger.warn(`Observability updateTrace failed: ${err}`));

      this.observability
        .flush()
        .catch((err) => this.logger.warn(`Observability flush failed: ${err}`));
    }

    // Fire-and-forget: log the prompt/response as YAML
    const endTime = new Date();
    const logEntry = this.promptLogger.buildLogEntry({
      startTime: new Date(startTime),
      endTime,
      model: this.config.openai.chatModel,
      prompt: fullPrompt,
      chunks: chunks.map((c) => c.text),
      query,
      response: fullAnswer,
    });
    this.promptLogger
      .log(logEntry)
      .catch((err) => this.logger.error('Failed to write prompt log:', err));
  }
}
