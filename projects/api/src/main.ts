import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register multipart plugin for file uploads
  await app.register(multipart);

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
