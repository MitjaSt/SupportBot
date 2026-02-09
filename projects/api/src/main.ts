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

  // Enable CORS for development
  app.enableCors();

  const port = process.env.PORT ?? 3030;
  await app.listen(port, '0.0.0.0');

  console.warn(`➡️   Server running on:  http://localhost:${port}`);
}

bootstrap();
