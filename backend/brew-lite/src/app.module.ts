import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health/health.controller.js';
import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [ProductsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
