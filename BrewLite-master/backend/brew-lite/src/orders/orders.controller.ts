import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { TransitionOrderDto } from './dto/transition-order.dto.js';

interface AuthedRequest {
  user?: { userId: number; email: string } | null;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: AuthedRequest) {
    return this.ordersService.create(createOrderDto, req.user?.userId);
  }

  @Patch(':id/status')
  transitionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TransitionOrderDto,
  ) {
    return this.ordersService.transitionStatus(id, dto.status);
  }

  /**
   * - Có JWT: chỉ trả đơn của chính user đó.
   * - Khách: truyền ?ids=1,2,3 (các đơn đã đặt trên thiết bị) hoặc ?userId= (cũ).
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @Req() req: AuthedRequest,
    @Query('userId') userId?: string,
    @Query('ids') ids?: string,
  ) {
    const parsedUserId = req.user?.userId ?? (userId ? parseInt(userId, 10) : undefined);
    const parsedIds = ids
      ? ids
          .split(',')
          .map((x) => parseInt(x, 10))
          .filter((n) => Number.isInteger(n))
      : undefined;
    return this.ordersService.findAll(parsedUserId, parsedIds);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }
}

