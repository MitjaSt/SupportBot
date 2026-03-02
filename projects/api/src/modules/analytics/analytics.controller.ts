import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  AnalyticsService,
  type KnowledgeBasePage,
  type RetrievalAnalytics,
} from './analytics.service';
import type { SearchResult } from '../vector-db/vector-db.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('retrieval')
  getRetrievalAnalytics(): Promise<RetrievalAnalytics> {
    return this.analytics.getRetrievalAnalytics();
  }

  @Get('knowledge-base/sources')
  getDistinctSources(): Promise<string[]> {
    return this.analytics.getDistinctSources();
  }

  @Get('knowledge-base')
  searchKnowledgeBase(
    @Query('q') q = '',
    @Query('source') source?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<KnowledgeBasePage> {
    return this.analytics.searchKnowledgeBase(
      q,
      source || undefined,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Post('knowledge-base/test-retrieval')
  testRetrieval(
    @Body('query') query: string,
    @Body('limit') limit = 10,
  ): Promise<SearchResult[]> {
    return this.analytics.testRetrieval(query, limit);
  }
}
