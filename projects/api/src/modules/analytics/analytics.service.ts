import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';

export interface TimeSeriesPoint {
  date: string;
  avgScore: number;
  totalQueries: number;
}

export interface TopSource {
  source: string;
  retrievalCount: number;
  avgScore: number;
}

export interface DeadQuery {
  id: number;
  userMessage: string;
  createdAt: string;
  sessionId: string;
}

export interface RetrievalAnalytics {
  summary: {
    totalAssistantMessages: number;
    avgScoreOverall: number | null;
    pctDeadQueries: number;
  };
  timeSeries: TimeSeriesPoint[];
  topSources: TopSource[];
  deadQueries: DeadQuery[];
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly dbService: DatabaseService) {}

  async getRetrievalAnalytics(): Promise<RetrievalAnalytics> {
    const [summary, timeSeries, topSources, deadQueries] = await Promise.all([
      this.getSummary(),
      this.getTimeSeries(),
      this.getTopSources(),
      this.getDeadQueries(),
    ]);

    return { summary, timeSeries, topSources, deadQueries };
  }

  private async getSummary() {
    const result = await this.dbService.db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE role = 'assistant') AS total_assistant,
        COUNT(*) FILTER (WHERE role = 'assistant' AND (chunks IS NULL OR chunks = '[]'::jsonb)) AS dead_count,
        (
          SELECT AVG((chunk->>'score')::float)
          FROM messages m2, jsonb_array_elements(m2.chunks) AS chunk
          WHERE m2.role = 'assistant'
            AND m2.chunks IS NOT NULL
            AND jsonb_array_length(m2.chunks) > 0
        ) AS avg_score_overall
      FROM messages
    `);

    const row = result.rows[0] as {
      total_assistant: string;
      dead_count: string;
      avg_score_overall: string | null;
    };

    const total = parseInt(row.total_assistant, 10) || 0;
    const dead = parseInt(row.dead_count, 10) || 0;

    return {
      totalAssistantMessages: total,
      avgScoreOverall: row.avg_score_overall ? parseFloat(row.avg_score_overall) : null,
      pctDeadQueries: total > 0 ? (dead / total) * 100 : 0,
    };
  }

  private async getTimeSeries(): Promise<TimeSeriesPoint[]> {
    const result = await this.dbService.db.execute(sql`
      SELECT
        date_trunc('day', m.created_at)::date AS day,
        AVG((chunk->>'score')::float) AS avg_score,
        COUNT(DISTINCT m.id) AS total_queries
      FROM messages m, jsonb_array_elements(m.chunks) AS chunk
      WHERE m.role = 'assistant'
        AND m.chunks IS NOT NULL
        AND jsonb_array_length(m.chunks) > 0
        AND m.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `);

    return (result.rows as { day: string; avg_score: string; total_queries: string }[]).map(
      (r) => ({
        date: String(r.day),
        avgScore: parseFloat(r.avg_score),
        totalQueries: parseInt(r.total_queries, 10),
      }),
    );
  }

  private async getTopSources(): Promise<TopSource[]> {
    const result = await this.dbService.db.execute(sql`
      SELECT
        chunk->>'source' AS source,
        COUNT(*) AS retrieval_count,
        AVG((chunk->>'score')::float) AS avg_score
      FROM messages m, jsonb_array_elements(m.chunks) AS chunk
      WHERE m.role = 'assistant'
        AND m.chunks IS NOT NULL
      GROUP BY source
      ORDER BY retrieval_count DESC
      LIMIT 5
    `);

    return (
      result.rows as { source: string; retrieval_count: string; avg_score: string }[]
    ).map((r) => ({
      source: r.source,
      retrievalCount: parseInt(r.retrieval_count, 10),
      avgScore: parseFloat(r.avg_score),
    }));
  }

  private async getDeadQueries(): Promise<DeadQuery[]> {
    const result = await this.dbService.db.execute(sql`
      SELECT
        u.id,
        u.content AS user_message,
        a.created_at,
        u.session_id
      FROM messages a
      JOIN LATERAL (
        SELECT id, content, session_id
        FROM messages
        WHERE session_id = a.session_id
          AND role = 'user'
          AND id < a.id
        ORDER BY id DESC
        LIMIT 1
      ) u ON true
      WHERE a.role = 'assistant'
        AND (a.chunks IS NULL OR a.chunks = '[]'::jsonb)
      ORDER BY a.created_at DESC
      LIMIT 50
    `);

    return (
      result.rows as { id: number; user_message: string; created_at: string; session_id: string }[]
    ).map((r) => ({
      id: r.id,
      userMessage: r.user_message,
      createdAt: String(r.created_at),
      sessionId: r.session_id,
    }));
  }
}
