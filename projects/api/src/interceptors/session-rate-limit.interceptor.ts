import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import NodeCache from 'node-cache';
import type { FastifyReply, FastifyRequest } from 'fastify';

// Fixed-window counter per session. No Redis needed — node-cache is already in deps.
const cache = new NodeCache({ checkperiod: 120 });

@Injectable()
export class SessionRateLimitInterceptor implements NestInterceptor {
  private readonly max: number;
  private readonly windowSec: number;

  constructor() {
    this.max = parseInt(process.env.RATE_LIMIT_SESSION_MAX ?? '20', 10);
    this.windowSec = Math.ceil(
      parseInt(process.env.RATE_LIMIT_SESSION_WINDOW_MS ?? '60000', 10) / 1000,
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const body = request.body as Record<string, unknown> | undefined;
    const query = request.query as Record<string, string> | undefined;
    const sessionId = (body?.['sessionId'] ?? query?.['sessionId']) as string | undefined;

    // Routes without a session (e.g. pipeline, system) are not session-limited.
    if (!sessionId) return next.handle();

    const key = `rl:session:${sessionId}`;
    const ttlTimestamp = cache.getTtl(key);
    const current = cache.get<number>(key) ?? 0;

    if (current >= this.max) {
      const retryAfter = ttlTimestamp
        ? Math.max(1, Math.ceil((ttlTimestamp - Date.now()) / 1000))
        : this.windowSec;
      reply.header('Retry-After', String(retryAfter));
      throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (current === 0) {
      cache.set(key, 1, this.windowSec);
    } else {
      // Preserve the existing window TTL — don't reset it on each request.
      const remainingSecs = ttlTimestamp
        ? Math.max(1, Math.ceil((ttlTimestamp - Date.now()) / 1000))
        : this.windowSec;
      cache.set(key, current + 1, remainingSecs);
    }

    return next.handle();
  }
}
