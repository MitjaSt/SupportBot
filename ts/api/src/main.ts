import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Enable CORS for development
  app.enableCors();

  const port = process.env.PORT ?? 3030;
  await app.listen(port, '0.0.0.0');

  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();
