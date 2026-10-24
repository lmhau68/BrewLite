import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { OptionsController } from './options.controller.js';

@Module({
  controllers: [ProductsController, OptionsController],
  providers: [ProductsService],
})
export class ProductsModule {}
