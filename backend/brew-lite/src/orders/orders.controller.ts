import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { TransitionOrderDto } from './dto/transition-order.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Patch(':id/status')
  transitionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionOrderDto,
  ) {
    return this.ordersService.transitionStatus(id, dto.status);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;
    return this.ordersService.findAll(parsedUserId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }
}

