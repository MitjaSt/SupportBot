import './instrument';
import * as Sentry from '@sentry/nestjs';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { checkEnv } from './check-env';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { SessionRateLimitInterceptor } from './interceptors/session-rate-limit.interceptor';
import { CoralogixLoggerService } from './modules/logging/coralogix-logger.service';
import rateLimit from '@fastify/rate-limit';

async function bootstrap() {
  checkEnv();
  // Allow up to 50 MB bodies (audio uploads).
  const adapter = new FastifyAdapter({ bodyLimit: 50 * 1024 * 1024 });

  const logger = new CoralogixLoggerService();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { logger });

  // Register binary content-type parsers for audio uploads.
  // The voice route reads request.body as a Buffer — no multipart plugin needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = app.getHttpAdapter().getInstance() as any;

  // IP-based flood protection — coarse backstop against DoS.
  // Intentionally high (default 200/min) because many real users share a
  // single IP via VPNs or corporate proxies. Per-user throttling is handled
  // by SessionRateLimitInterceptor using the session ID from the request body.
  await instance.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_IP_MAX ?? '200', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_IP_WINDOW_MS ?? '60000', 10),
    errorResponseBuilder: (_req: unknown, context: { after: string }) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `IP rate limit exceeded, retry after ${context.after}`,
    }),
  });
  instance.addContentTypeParser(
    [
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'video/webm',
      'audio/wav',
    ],
    {
      parseAs: 'buffer',
      bodyLimit: 50 * 1024 * 1024,
    },
    (_req: unknown, body: Buffer, done: (err: Error | null, body?: Buffer) => void) =>
      done(null, body),
  );

  // index.html must never be cached — Vite hashes JS/CSS filenames so those
  // are safe to cache, but a stale index.html points at old bundle hashes.
  instance.addHook(
    'onSend',
    (
      _req: unknown,
      reply: { getHeader: (k: string) => string | undefined; header: (k: string, v: string) => void },
      _payload: unknown,
      done: () => void,
    ) => {
      const ct = reply.getHeader('content-type');
      if (ct?.startsWith('text/html')) {
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      done();
    },
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new SessionRateLimitInterceptor());

  // All API routes live under /api — matches the frontend's fetch calls in production.
  // /metrics is excluded so Prometheus can still scrape it at the bare path.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  // Enable CORS for development
  app.enableCors();

  const port = process.env.PORT ?? 3030;
  await app.listen(port, '0.0.0.0');

  console.warn(`➡️   Server running on:  http://localhost:${port}`);

  // Flush any buffered Coralogix log entries before the process exits.
  process.on('SIGTERM', () => logger.shutdown().finally(() => process.exit(0)));
  process.on('SIGINT', () => logger.shutdown().finally(() => process.exit(0)));
}

bootstrap().catch(async (err) => {
  Sentry.captureException(err);
  await Sentry.flush(2000);
  process.exit(1);
});
