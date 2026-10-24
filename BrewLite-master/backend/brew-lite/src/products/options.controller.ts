import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service.js';

/** GET /options -> { sizes, toppings } để frontend render động Size/Topping. */
@Controller('options')
export class OptionsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findOptions();
  }
}
