import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@/config/config.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorDbService, SearchResult } from '../vector-db/vector-db.service';
import { PromptLoggerService } from '../prompt-logger/prompt-logger.service';
import { ObservabilityService } from '../observability/observability.service';

export interface RagResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
  backend: 'openai';
}

// System prompt matching Python implementation
const SYSTEM_PROMPT = `You are a helpful assistant for the Macular Society helpline.
Answer questions about macular disease based ONLY on the provided context.
If the context doesn't contain relevant information, say:
"I do not have information about that. Can I help you with something else?"

Keep responses concise and suitable for a phone conversation.
Refer to the person as "you" not "the caller".`;

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
  ) {
    this.openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout * 1000,
    });
    this.topK = config.rag.topK;
    this.scoreThreshold = config.rag.scoreThreshold;
    this.maxTokens = config.rag.maxTokens;
  }

  async retrieve(query: string): Promise<SearchResult[]> {
    const queryVector = await this.embeddings.embed(query);

    const results = await this.vectorDb.search(
      queryVector,
      this.topK,
      this.scoreThreshold,
    );
    return results;
  }

  async generateAnswer(
    query: string,
    chunks: SearchResult[],
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt: string = SYSTEM_PROMPT,
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

    // Generate response
    const response = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.7,
    });

    return {
      answer: response.choices[0]?.message?.content ?? '',
      sources: chunks,
      model: this.config.openai.chatModel,
      backend: 'openai',
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

    // Retrieval phase (timed)
    const retrievalStart = Date.now();
    const chunks = await this.retrieve(query);
    const retrievalDurationMs = Date.now() - retrievalStart;

    if (trace) {
      this.observability
        .logRetrieval({
          trace,
          query,
          chunks: chunks.map((c) => c.text),
          scores: chunks.map((c) => c.score),
          documentIds: chunks.map((c) => c.id),
          model: this.config.embedding.model,
          durationMs: retrievalDurationMs,
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
        this.logger.debug('Using prompt from observability adapter');
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch prompt from observability, using default: ${e}`);
    }

    // Generation phase (timed)
    const generationStart = Date.now();
    const result = await this.generateAnswer(query, chunks, conversationHistory, systemPrompt);
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
      .catch((err) => console.error('Failed to write prompt log:', err));

    return result;
  }
}
