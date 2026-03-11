import { ConfigService } from '@/config/config.service';
import { Injectable } from '@nestjs/common';

const OPENAI_API_BASE = 'https://api.openai.com';

interface BaseBucket {
  start_time: number;
  end_time: number;
}
interface CompletionBucket extends BaseBucket {
  results: Array<{
    input_tokens: number;
    output_tokens: number;
    input_cached_tokens?: number;
    num_model_requests: number;
  }>;
}

interface EmbeddingBucket extends BaseBucket {
  results: Array<{
    input_tokens: number;
    num_model_requests: number;
  }>;
}

interface CostBucket extends BaseBucket {
  results: Array<{
    amount: { value: number | string; currency: string };
  }>;
}

export interface UsageWindow {
  completionInputTokens: number;
  completionOutputTokens: number;
  completionCachedTokens: number;
  completionRequests: number;
  embeddingInputTokens: number;
  embeddingRequests: number;
  totalRequests: number;
}

export interface BillingInfo {
  last30DaysCostUsd: number | null;
  currentMonthCostUsd: number | null;
  error?: string;
}

export interface OpenAIStats {
  timestamp: string;
  usage: {
    lastHour: UsageWindow;
    last4Hours: UsageWindow;
    lastDay: UsageWindow;
    dayBefore: UsageWindow;
    error?: string;
  };
  billing: BillingInfo;
}

@Injectable()
export class SystemService {
  constructor(private readonly config: ConfigService) {}

  async getOpenAIStats(): Promise<OpenAIStats> {
    const adminKey = this.config.openai.adminApiKey;
    const now = Math.floor(Date.now() / 1000);
    const twoDaysAgo = now - 48 * 3600;
    const thirtyDaysAgo = now - 30 * 24 * 3600;

    const [completionsResult, embeddingsResult, billingResult] =
      await Promise.allSettled([
        this.fetchCompletionBuckets(adminKey, twoDaysAgo, now),
        this.fetchEmbeddingBuckets(adminKey, twoDaysAgo, now),
        this.fetchBillingInfo(adminKey, thirtyDaysAgo, now),
      ]);

    const completionBuckets =
      completionsResult.status === 'fulfilled' ? completionsResult.value : [];
    const embeddingBuckets =
      embeddingsResult.status === 'fulfilled' ? embeddingsResult.value : [];

    const usageError =
      completionsResult.status === 'rejected'
        ? String(completionsResult.reason)
        : undefined;

    return {
      timestamp: new Date().toISOString(),
      usage: {
        lastHour: this.aggregateWindow(
          completionBuckets,
          embeddingBuckets,
          now - 3600,
          now,
        ),
        last4Hours: this.aggregateWindow(
          completionBuckets,
          embeddingBuckets,
          now - 4 * 3600,
          now,
        ),
        lastDay: this.aggregateWindow(
          completionBuckets,
          embeddingBuckets,
          now - 24 * 3600,
          now,
        ),
        dayBefore: this.aggregateWindow(
          completionBuckets,
          embeddingBuckets,
          now - 48 * 3600,
          now - 24 * 3600,
        ),
        ...(usageError && { error: usageError }),
      },
      billing:
        billingResult.status === 'fulfilled'
          ? billingResult.value
          : {
              last30DaysCostUsd: null,
              currentMonthCostUsd: null,
              error: String(billingResult.reason),
            },
    };
  }

  private async fetchCompletionBuckets(
    apiKey: string,
    startTime: number,
    endTime: number,
  ): Promise<CompletionBucket[]> {
    const url = new URL(`${OPENAI_API_BASE}/v1/organization/usage/completions`);
    url.searchParams.set('start_time', String(startTime));
    url.searchParams.set('end_time', String(endTime));
    url.searchParams.set('bucket_width', '1h');
    url.searchParams.set('limit', '168');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Completions usage API ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { data: CompletionBucket[] };
    return data.data ?? [];
  }

  private async fetchEmbeddingBuckets(
    apiKey: string,
    startTime: number,
    endTime: number,
  ): Promise<EmbeddingBucket[]> {
    const url = new URL(`${OPENAI_API_BASE}/v1/organization/usage/embeddings`);
    url.searchParams.set('start_time', String(startTime));
    url.searchParams.set('end_time', String(endTime));
    url.searchParams.set('bucket_width', '1h');
    url.searchParams.set('limit', '168');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embeddings usage API ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { data: EmbeddingBucket[] };
    return data.data ?? [];
  }

  private async fetchBillingInfo(
    apiKey: string,
    startTime: number,
    endTime: number,
  ): Promise<BillingInfo> {
    const url = new URL(`${OPENAI_API_BASE}/v1/organization/costs`);
    url.searchParams.set('start_time', String(startTime));
    url.searchParams.set('end_time', String(endTime));
    url.searchParams.set('bucket_width', '1d');
    url.searchParams.set('limit', '31');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Costs API ${response.status}: ${body}`);
    }

    const data = (await response.json()) as { data: CostBucket[] };
    const buckets = data.data ?? [];

    const now = Math.floor(Date.now() / 1000);
    const currentMonthStart = this.startOfCurrentMonthTs();

    let last30DaysCostUsd = 0;
    let currentMonthCostUsd = 0;

    for (const bucket of buckets) {
      const bucketCost = bucket.results.reduce(
        (sum, r) => sum + parseFloat(String(r.amount?.value ?? 0)),
        0,
      );
      if (bucket.start_time >= startTime && bucket.start_time < now) {
        last30DaysCostUsd += bucketCost;
      }
      if (bucket.start_time >= currentMonthStart && bucket.start_time < now) {
        currentMonthCostUsd += bucketCost;
      }
    }

    return {
      last30DaysCostUsd: Math.round(last30DaysCostUsd * 10000) / 10000,
      currentMonthCostUsd: Math.round(currentMonthCostUsd * 10000) / 10000,
    };
  }

  private startOfCurrentMonthTs(): number {
    const d = new Date();
    return Math.floor(
      new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000,
    );
  }

  private aggregateWindow(
    completionBuckets: CompletionBucket[],
    embeddingBuckets: EmbeddingBucket[],
    startTs: number,
    endTs: number,
  ): UsageWindow {
    const window: UsageWindow = {
      completionInputTokens: 0,
      completionOutputTokens: 0,
      completionCachedTokens: 0,
      completionRequests: 0,
      embeddingInputTokens: 0,
      embeddingRequests: 0,
      totalRequests: 0,
    };

    for (const bucket of completionBuckets) {
      if (bucket.start_time >= startTs && bucket.start_time < endTs) {
        for (const r of bucket.results) {
          window.completionInputTokens += r.input_tokens ?? 0;
          window.completionOutputTokens += r.output_tokens ?? 0;
          window.completionCachedTokens += r.input_cached_tokens ?? 0;
          window.completionRequests += r.num_model_requests ?? 0;
        }
      }
    }

    for (const bucket of embeddingBuckets) {
      if (bucket.start_time >= startTs && bucket.start_time < endTs) {
        for (const r of bucket.results) {
          window.embeddingInputTokens += r.input_tokens ?? 0;
          window.embeddingRequests += r.num_model_requests ?? 0;
        }
      }
    }

    window.totalRequests = window.completionRequests + window.embeddingRequests;
    return window;
  }
}
