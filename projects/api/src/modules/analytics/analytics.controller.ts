import { Controller, Get } from '@nestjs/common';
import { AnalyticsService, type RetrievalAnalytics } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('retrieval')
  getRetrievalAnalytics(): Promise<RetrievalAnalytics> {
    return this.analytics.getRetrievalAnalytics();
  }
}
