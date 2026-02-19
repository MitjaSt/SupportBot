import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

/**
 * MetricsService handles all Prometheus metrics for the RAG system
 *
 * Metrics categories:
 * - Request metrics (rate, latency, errors)
 * - Token usage (input, output, cost)
 * - RAG performance (retrieval scores, chunks)
 * - OpenAI API (duration, errors)
 * - Function calling (tool usage)
 * - Voice pipeline (Whisper, Piper)
 * - Database (query performance)
 */
@Injectable()
export class MetricsService {
  // Request Metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestErrors: Counter;

  // Token Metrics
  public readonly tokensInputTotal: Counter;
  public readonly tokensOutputTotal: Counter;
  public readonly tokensTotal: Counter;
  public readonly tokensPerRequest: Histogram;
  public readonly estimatedCost: Counter;

  // RAG Metrics
  public readonly ragRetrievalScore: Histogram;
  public readonly ragChunksRetrieved: Histogram;
  public readonly ragRetrievalDuration: Histogram;
  public readonly ragQueriesTotal: Counter;
  public readonly ragFailedRetrievals: Counter;

  // OpenAI API Metrics
  public readonly openaiApiDuration: Histogram;
  public readonly openaiApiErrors: Counter;
  public readonly openaiApiCalls: Counter;

  // Function Calling Metrics
  public readonly functionCallsTotal: Counter;
  public readonly functionCallDuration: Histogram;
  public readonly functionCallErrors: Counter;
  public readonly contactCollectionSuccess: Counter;

  // Voice Pipeline Metrics
  public readonly whisperTranscriptionDuration: Histogram;
  public readonly whisperTranscriptionTotal: Counter;
  public readonly whisperTranscriptionErrors: Counter;
  public readonly whisperAudioDuration: Histogram;

  public readonly piperSynthesisDuration: Histogram;
  public readonly piperSynthesisTotal: Counter;
  public readonly piperSynthesisErrors: Counter;
  public readonly piperAudioGenerated: Counter;

  // Session Metrics
  public readonly activeSessions: Gauge;
  public readonly newSessions: Counter;
  public readonly messagesPerSession: Histogram;

  // Database Metrics
  public readonly dbQueryDuration: Histogram;
  public readonly dbConnectionPoolSize: Gauge;

  constructor() {
    // Initialize all metrics

    // HTTP Request Metrics
    this.httpRequestsTotal = new Counter({
      name: 'macular_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'macular_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.httpRequestErrors = new Counter({
      name: 'macular_http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [register],
    });

    // Token Metrics
    this.tokensInputTotal = new Counter({
      name: 'macular_tokens_input_total',
      help: 'Total input tokens consumed',
      labelNames: ['model', 'endpoint'],
      registers: [register],
    });

    this.tokensOutputTotal = new Counter({
      name: 'macular_tokens_output_total',
      help: 'Total output tokens generated',
      labelNames: ['model', 'endpoint'],
      registers: [register],
    });

    this.tokensTotal = new Counter({
      name: 'macular_tokens_total',
      help: 'Total tokens (input + output)',
      labelNames: ['model', 'endpoint'],
      registers: [register],
    });

    this.tokensPerRequest = new Histogram({
      name: 'macular_tokens_per_request',
      help: 'Distribution of tokens per request',
      labelNames: ['type', 'model'],
      buckets: [100, 500, 1000, 2000, 4000, 8000, 16000],
      registers: [register],
    });

    this.estimatedCost = new Counter({
      name: 'macular_estimated_cost_usd',
      help: 'Estimated cost in USD based on token usage',
      labelNames: ['model'],
      registers: [register],
    });

    // RAG Metrics
    this.ragRetrievalScore = new Histogram({
      name: 'macular_rag_retrieval_score',
      help: 'Cosine similarity score distribution from vector search',
      buckets: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
      registers: [register],
    });

    this.ragChunksRetrieved = new Histogram({
      name: 'macular_rag_chunks_retrieved',
      help: 'Number of chunks retrieved per query',
      buckets: [0, 1, 2, 3, 5, 10],
      registers: [register],
    });

    this.ragRetrievalDuration = new Histogram({
      name: 'macular_rag_retrieval_duration_seconds',
      help: 'Time taken for vector search',
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });

    this.ragQueriesTotal = new Counter({
      name: 'macular_rag_queries_total',
      help: 'Total number of RAG queries',
      labelNames: ['status'],
      registers: [register],
    });

    this.ragFailedRetrievals = new Counter({
      name: 'macular_rag_failed_retrievals_total',
      help: 'Number of queries with no results above threshold',
      registers: [register],
    });

    // OpenAI API Metrics
    this.openaiApiDuration = new Histogram({
      name: 'macular_openai_api_duration_seconds',
      help: 'OpenAI API call duration',
      labelNames: ['operation', 'model'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
      registers: [register],
    });

    this.openaiApiErrors = new Counter({
      name: 'macular_openai_api_errors_total',
      help: 'OpenAI API errors',
      labelNames: ['operation', 'error_type'],
      registers: [register],
    });

    this.openaiApiCalls = new Counter({
      name: 'macular_openai_api_calls_total',
      help: 'Total OpenAI API calls',
      labelNames: ['operation', 'model'],
      registers: [register],
    });

    // Function Calling Metrics
    this.functionCallsTotal = new Counter({
      name: 'macular_function_calls_total',
      help: 'Total function calls by tool name',
      labelNames: ['tool_name', 'status'],
      registers: [register],
    });

    this.functionCallDuration = new Histogram({
      name: 'macular_function_call_duration_seconds',
      help: 'Function call execution duration',
      labelNames: ['tool_name'],
      buckets: [0.01, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    this.functionCallErrors = new Counter({
      name: 'macular_function_call_errors_total',
      help: 'Function call errors',
      labelNames: ['tool_name', 'error_type'],
      registers: [register],
    });

    this.contactCollectionSuccess = new Counter({
      name: 'macular_contact_collection_success_total',
      help: 'Successful contact information collections',
      labelNames: ['type'],
      registers: [register],
    });

    // Voice Pipeline Metrics - Whisper (STT)
    this.whisperTranscriptionDuration = new Histogram({
      name: 'macular_whisper_transcription_duration_seconds',
      help: 'Whisper transcription processing time',
      buckets: [0.5, 1, 2, 5, 10, 30],
      registers: [register],
    });

    this.whisperTranscriptionTotal = new Counter({
      name: 'macular_whisper_transcription_total',
      help: 'Total Whisper transcriptions',
      labelNames: ['model', 'language'],
      registers: [register],
    });

    this.whisperTranscriptionErrors = new Counter({
      name: 'macular_whisper_transcription_errors_total',
      help: 'Whisper transcription errors',
      labelNames: ['error_type'],
      registers: [register],
    });

    this.whisperAudioDuration = new Histogram({
      name: 'macular_whisper_audio_duration_seconds',
      help: 'Duration of audio files transcribed',
      buckets: [5, 10, 30, 60, 120, 300],
      registers: [register],
    });

    // Voice Pipeline Metrics - Piper (TTS)
    this.piperSynthesisDuration = new Histogram({
      name: 'macular_piper_synthesis_duration_seconds',
      help: 'Piper TTS synthesis processing time',
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.piperSynthesisTotal = new Counter({
      name: 'macular_piper_synthesis_total',
      help: 'Total Piper TTS syntheses',
      labelNames: ['voice', 'language'],
      registers: [register],
    });

    this.piperSynthesisErrors = new Counter({
      name: 'macular_piper_synthesis_errors_total',
      help: 'Piper TTS synthesis errors',
      labelNames: ['error_type'],
      registers: [register],
    });

    this.piperAudioGenerated = new Counter({
      name: 'macular_piper_audio_bytes_generated_total',
      help: 'Total audio bytes generated by Piper',
      registers: [register],
    });

    // Session Metrics
    this.activeSessions = new Gauge({
      name: 'macular_active_sessions',
      help: 'Current number of active sessions',
      registers: [register],
    });

    this.newSessions = new Counter({
      name: 'macular_new_sessions_total',
      help: 'Total number of new sessions created',
      registers: [register],
    });

    this.messagesPerSession = new Histogram({
      name: 'macular_messages_per_session',
      help: 'Distribution of messages per session',
      buckets: [1, 2, 5, 10, 20, 50],
      registers: [register],
    });

    // Database Metrics
    this.dbQueryDuration = new Histogram({
      name: 'macular_db_query_duration_seconds',
      help: 'Database query duration',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [register],
    });

    this.dbConnectionPoolSize = new Gauge({
      name: 'macular_db_connection_pool_size',
      help: 'Current database connection pool size',
      registers: [register],
    });
  }

  /**
   * Calculate estimated cost based on token usage
   * OpenAI pricing (as of 2026):
   * - gpt-5.2: $1.75 / 1M input tokens, $14.00 / 1M output tokens
   * - gpt-4o-mini: $0.15 / 1M input tokens, $0.60 / 1M output tokens
   * - gpt-4o: $5.00 / 1M input tokens, $15.00 / 1M output tokens (legacy)
   * - text-embedding-3-small: $0.02 / 1M tokens
   */
  recordTokenCost(model: string, inputTokens: number, outputTokens: number) {
    let cost = 0;

    if (model.includes('gpt-5.2')) {
      cost = (inputTokens * 1.75 / 1_000_000) + (outputTokens * 14.0 / 1_000_000);
    } else if (model.includes('gpt-5')) {
      // Other gpt-5 models (fallback to gpt-5.2 pricing)
      cost = (inputTokens * 1.75 / 1_000_000) + (outputTokens * 14.0 / 1_000_000);
    } else if (model.includes('gpt-4o-mini')) {
      cost = (inputTokens * 0.15 / 1_000_000) + (outputTokens * 0.60 / 1_000_000);
    } else if (model.includes('gpt-4o')) {
      cost = (inputTokens * 5.0 / 1_000_000) + (outputTokens * 15.0 / 1_000_000);
    } else if (model.includes('embedding')) {
      cost = (inputTokens + outputTokens) * 0.02 / 1_000_000;
    }

    if (cost > 0) {
      this.estimatedCost.inc({ model }, cost);
    }
  }
}
