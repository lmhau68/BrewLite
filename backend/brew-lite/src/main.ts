import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kích hoạt ValidationPipe toàn cục để validate dữ liệu DTO (Task 7)
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
  console.log(`🚀 BrewLite Backend đang chạy tại: http://localhost:3000`);
}
void bootstrap();