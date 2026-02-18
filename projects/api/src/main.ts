import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  // Allow up to 50 MB bodies (audio uploads).
  const adapter = new FastifyAdapter({ bodyLimit: 50 * 1024 * 1024 });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  // Register binary content-type parsers for audio uploads.
  // The voice route reads request.body as a Buffer — no multipart plugin needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = app.getHttpAdapter().getInstance() as any;
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
}

bootstrap();
