import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  processPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Headers('idempotency-key') headerKey?: string,
  ) {
    const idempotencyKey = headerKey ?? createPaymentDto.idempotencyKey;
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Header Idempotency-Key là bắt buộc');
    }
    return this.paymentsService.processPayment(createPaymentDto, idempotencyKey.trim());
  }

  @Get('order/:orderId')
  findByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.findByOrderId(orderId);
  }
}

