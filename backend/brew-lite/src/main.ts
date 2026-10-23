import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Cho phép frontend (Next.js dev: localhost:3000) gọi API
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  await app.listen(process.env.PORT ?? 4000);
}
await bootstrap();
