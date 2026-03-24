import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/modules/auth/guards/permissions.guard';
import { Permissions } from '@/modules/auth/decorators/permissions.decorator';
import { SessionRepository, type SessionListItem } from '../database/session.repository';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('sessions:read')
@Controller('analytics/conversations')
export class ConversationsController {
  constructor(private readonly sessions: SessionRepository) {}

  @Get()
  listConversations(
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('limit') limit = '50',
  ): Promise<SessionListItem[]> {
    return this.sessions.listAllSessions({
      search: search || undefined,
      state: state || undefined,
      limit: Math.min(parseInt(limit, 10) || 50, 500),
    });
  }
}
