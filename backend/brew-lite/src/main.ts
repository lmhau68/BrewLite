import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

if (existsSync('.env')) loadEnvFile();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kích hoạt ValidationPipe toàn cục để validate dữ liệu DTO (Task 7)
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000' });

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 BrewLite Backend đang chạy tại: http://localhost:${port}`);
}
void bootstrap();
