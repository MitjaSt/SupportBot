import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@/config/config.service';
import { MetricsService } from '../metrics/metrics.service';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
}

@Injectable()
export class EmbeddingsService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly vectorSize: number;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      timeout: config.openai.timeout * 1000,
    });
    this.model = config.openai.embeddingModel;
    this.vectorSize = config.embedding.vectorSize;
  }

  async embed(text: string): Promise<number[]> {
    const apiTimer = this.metrics.openaiApiDuration.startTimer({ operation: 'embedding', model: this.model });
    this.metrics.openaiApiCalls.inc({ operation: 'embedding', model: this.model });

    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    apiTimer();

    // Record token usage
    if (response.usage) {
      const { prompt_tokens, total_tokens } = response.usage;
      this.metrics.tokensInputTotal.inc({ model: this.model, endpoint: 'embedding' }, prompt_tokens);
      this.metrics.tokensTotal.inc({ model: this.model, endpoint: 'embedding' }, total_tokens);
      this.metrics.tokensPerRequest.observe({ type: 'input', model: this.model }, prompt_tokens);
      this.metrics.recordTokenCost(this.model, prompt_tokens, 0);
    }

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    // OpenAI has a limit on batch size, process in chunks of 100
    const batchSize = 100;
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const apiTimer = this.metrics.openaiApiDuration.startTimer({ operation: 'embedding_batch', model: this.model });
      this.metrics.openaiApiCalls.inc({ operation: 'embedding_batch', model: this.model });

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });

      apiTimer();

      // Record token usage
      if (response.usage) {
        const { prompt_tokens, total_tokens } = response.usage;
        this.metrics.tokensInputTotal.inc({ model: this.model, endpoint: 'embedding_batch' }, prompt_tokens);
        this.metrics.tokensTotal.inc({ model: this.model, endpoint: 'embedding_batch' }, total_tokens);
        this.metrics.tokensPerRequest.observe({ type: 'input', model: this.model }, prompt_tokens);
        this.metrics.recordTokenCost(this.model, prompt_tokens, 0);
      }

      for (let j = 0; j < batch.length; j++) {
        results.push({
          text: batch[j],
          embedding: response.data[j].embedding,
        });
      }
    }

    return results;
  }

  async embedWithMetadata(
    chunks: Array<{ text: string; source: string; chunkIndex: number }>,
  ): Promise<
    Array<{
      text: string;
      source: string;
      chunkIndex: number;
      embedding: number[];
    }>
  > {
    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embedBatch(texts);

    return chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i].embedding,
    }));
  }

  getVectorSize(): number {
    return this.vectorSize;
  }

  getModel(): string {
    return this.model;
  }
}
