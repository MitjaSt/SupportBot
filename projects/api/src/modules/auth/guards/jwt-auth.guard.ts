import {
  Injectable,
  Logger,
  type ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import { OPTIONAL_AUTH_KEY } from '../auth.constants';
import { ConfigService } from '@/config/config.service';
import { MetricsService } from '@/modules/metrics/metrics.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // When auth is disabled (local dev), skip all checks and leave req.user = null.
    if (!this.config.zitadel.enabled) {
      const req = context.switchToHttp().getRequest<FastifyRequest & { user: null }>();
      req.user = null;
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err) {
      if (!isOptional) {
        this.metrics.authJwtVerifiedTotal.inc({ result: 'failure' });
        // JWKS connectivity error → 503 so callers can distinguish from auth failure
        if (err instanceof Error && err.message.includes('JWKS')) {
          throw new ServiceUnavailableException('Authentication service unavailable');
        }
        const reason = err instanceof Error ? err.message : 'unknown';
        this.logger.warn(`JWT rejected: ${reason}`);
        throw err;
      }
      // Optional mode: any failure → req.user = null, allow through
      const req = context.switchToHttp().getRequest<FastifyRequest & { user: null }>();
      req.user = null;
      return true;
    }
  }

  // Called by passport after strategy.validate() returns — sets req.user.
  // In optional mode with no token, passport calls handleRequest with err=null, user=false.
  handleRequest<T>(err: Error | null, user: T | false, _info: unknown, context: ExecutionContext): T {
    const isOptional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isOptional && (err || !user)) {
      return null as T;
    }

    if (err || !user) {
      throw err ?? new UnauthorizedException();
    }

    return user;
  }
}
