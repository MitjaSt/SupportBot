import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@/config/config.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorDbService, SearchResult } from '../vector-db/vector-db.service';

export interface RagResponse {
  answer: string;
  sources: SearchResult[];
  model: string;
  backend: 'openai' | 'ollama';
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
  private readonly openaiClient: OpenAI;
  private readonly topK: number;
  private readonly scoreThreshold: number;
  private readonly maxTokens: number;

  constructor(
    private readonly config: ConfigService,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorDb: VectorDbService,
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
  ): Promise<RagResponse> {
    // Build context from chunks
    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.text}`)
      .join('\n\n');

    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
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

      console.warn(userMessage);

    messages.push({ role: 'user', content: userMessage });

    // Generate response
    if (this.config.openai.enabled) {
      return this.generateWithOpenAI(messages, chunks);
    } else {
      return this.generateWithOllama(messages, chunks);
    }
  }

  private async generateWithOpenAI(
    messages: OpenAI.ChatCompletionMessageParam[],
    sources: SearchResult[],
  ): Promise<RagResponse> {
    console.warn({messages});
    const response = await this.openaiClient.chat.completions.create({
      model: this.config.openai.chatModel,
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.7,
    });

    console.warn({response});

    return {
      answer: response.choices[0]?.message?.content ?? '',
      sources,
      model: this.config.openai.chatModel,
      backend: 'openai',
    };
  }

  private async generateWithOllama(
    messages: OpenAI.ChatCompletionMessageParam[],
    sources: SearchResult[],
  ): Promise<RagResponse> {
    // Use Ollama's OpenAI-compatible API
    const ollamaClient = new OpenAI({
      baseURL: `${this.config.ollama.url}/v1`,
      apiKey: 'ollama', // Ollama doesn't need a real key
      timeout: this.config.ollama.timeout * 1000,
    });

    const response = await ollamaClient.chat.completions.create({
      model: this.config.ollama.model,
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.7,
    });

    return {
      answer: response.choices[0]?.message?.content ?? '',
      sources,
      model: this.config.ollama.model,
      backend: 'ollama',
    };
  }

  async query(
    query: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<RagResponse> {
    const chunks = await this.retrieve(query);

    if (chunks.length === 0) {
      return {
        answer:
          'I do not have information about that. Can I help you with something else?',
        sources: [],
        model: this.config.openai.enabled
          ? this.config.openai.chatModel
          : this.config.ollama.model,
        backend: this.config.openai.enabled ? 'openai' : 'ollama',
      };
    }

    return this.generateAnswer(query, chunks, conversationHistory);
  }
}
