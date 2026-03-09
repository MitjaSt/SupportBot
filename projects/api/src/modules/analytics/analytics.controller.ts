import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
import {
  AnalyticsService,
  type ChunkInspectionResult,
  type KnowledgeBasePage,
  type RetrievalAnalytics,
} from './analytics.service';
import type { SearchResult } from '../vector-db/vector-db.service';
import { ObservabilityService } from '../observability/observability.service';
import { ConfigService } from '@/config/config.service';

export interface SystemPromptInfo {
  template: string;
  source: string;
  charCount: number;
  estimatedTokens: number;
  warnThreshold: number;
  rejectThreshold: number;
  maxTokens: number;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('analytics:read')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly observability: ObservabilityService,
    private readonly config: ConfigService,
  ) {}

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

  @Post('chunk-inspector')
  inspectChunks(@Body('text') text: string): ChunkInspectionResult {
    return this.analytics.inspectChunks(text);
  }

  @Get('system-prompt')
  async getSystemPrompt(): Promise<SystemPromptInfo | { error: string }> {
    const result = await this.observability.getPrompt();
    if (!result) {
      return { error: 'No prompt configured or available from any observability adapter' };
    }
    const { template, source } = result;
    const charCount = template.length;
    return {
      template,
      source,
      charCount,
      estimatedTokens: Math.round(charCount / 4),
      warnThreshold: this.config.rag.promptTokenWarnThreshold,
      rejectThreshold: this.config.rag.promptTokenRejectThreshold,
      maxTokens: this.config.rag.maxTokens,
    };
  }
}
