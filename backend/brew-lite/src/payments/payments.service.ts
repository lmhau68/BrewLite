import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';

/** Số tiền (VND) tương ứng với 1 điểm tích lũy. */
const POINTS_PER_UNIT = 10000;

const pointsFor = (total: number) => Math.floor(total / POINTS_PER_UNIT);

type PaymentWithOrder = Prisma.PaymentGetPayload<{ include: { order: true } }>;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async processPayment(dto: CreatePaymentDto, idempotencyKey: string) {
    if (idempotencyKey.length > 255) {
      throw new BadRequestException('Idempotency-Key không được dài quá 255 ký tự');
    }
    const existing = await this.findPaymentByKey(idempotencyKey);
    if (existing) return this.replay(existing, dto);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.order.findUnique({ where: { id: dto.orderId } });
          if (!order) {
            throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${dto.orderId}`);
          }
          if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED) {
            throw new BadRequestException(
              `Không thể thanh toán cho đơn hàng đang ở trạng thái: ${order.status}`,
            );
          }
          if (Math.abs(order.total - dto.amount) > 0.01) {
            throw new BadRequestException(
              `Số tiền thanh toán (${dto.amount}) không khớp với tổng đơn hàng (${order.total})`,
            );
          }

          const payment = await tx.payment.create({
            data: {
              orderId: order.id,
              idempotencyKey,
              amount: dto.amount,
              method: dto.method,
              status: PaymentStatus.PROCESSING,
            },
          });

          // This is the mock gateway boundary. Persisting its result with the payment
          // and order makes a repeated key replay the original outcome.
          if (dto.mockSuccess === false) {
            const failedPayment = await tx.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.FAILED, failureReason: 'Mock payment declined' },
            });
            const updated = await tx.order.updateMany({
              where: { id: order.id, status: order.status, version: order.version },
              data: { status: OrderStatus.PAYMENT_FAILED, version: { increment: 1 } },
            });
            if (updated.count !== 1) {
              throw new ConflictException('Đơn hàng vừa được cập nhật, vui lòng thử lại');
            }
            return {
              success: false,
              isIdempotent: false,
              message: 'Thanh toán giả lập thất bại; có thể thử lại bằng khóa mới',
              payment: failedPayment,
              orderStatus: OrderStatus.PAYMENT_FAILED,
              loyaltyPointsAwarded: 0,
            };
          }

          // Điểm tích lũy của đơn luôn được ghi nhận; số dư tài khoản chỉ cộng
          // khi đơn thuộc về một người dùng đã đăng nhập.
          const points = pointsFor(order.total);
          const updated = await tx.order.updateMany({
            where: { id: order.id, status: order.status, version: order.version },
            data: {
              status: OrderStatus.PAID,
              version: { increment: 1 },
              loyaltyPointsAwarded: points,
            },
          });
          if (updated.count !== 1) {
            throw new ConflictException('Đơn hàng vừa được thanh toán bởi yêu cầu khác');
          }
          const completedPayment = await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.SUCCEEDED },
          });
          if (order.userId && points > 0) {
            await tx.loyaltyTransaction.create({
              data: { userId: order.userId, orderId: order.id, points },
            });
            await tx.user.update({
              where: { id: order.userId },
              data: { loyaltyPoints: { increment: points } },
            });
          }

          return {
            success: true,
            isIdempotent: false,
            message: 'Thanh toán đơn hàng thành công qua cổng giả lập',
            payment: completedPayment,
            orderStatus: OrderStatus.PAID,
            loyaltyPointsAwarded: points,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.findPaymentByKey(idempotencyKey);
        if (duplicate) return this.replay(duplicate, dto);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        const duplicate = await this.findPaymentByKey(idempotencyKey);
        if (duplicate) return this.replay(duplicate, dto);
        throw new ConflictException('Thanh toán đang được xử lý đồng thời; vui lòng thử lại');
      }
      throw error;
    }
  }

  /**
   * Giao dịch đã tồn tại với khoá này: trả lại kết quả cũ, không tạo giao dịch mới.
   * `success` phản ánh kết quả thật của giao dịch đã lưu.
   */
  private replay(payment: PaymentWithOrder, dto: CreatePaymentDto) {
    if (
      payment.orderId !== dto.orderId ||
      payment.method !== dto.method ||
      Math.abs(payment.amount - dto.amount) > 0.01 ||
      (dto.mockSuccess === false) !== (payment.status === PaymentStatus.FAILED)
    ) {
      throw new ConflictException('Idempotency-Key đã được dùng cho yêu cầu thanh toán khác');
    }
    return {
      success: payment.status === PaymentStatus.SUCCEEDED,
      isIdempotent: true,
      message:
        payment.status === PaymentStatus.SUCCEEDED
          ? 'Yêu cầu này đã được thanh toán trước đó'
          : 'Yêu cầu này đã được xử lý trước đó',
      payment,
      orderStatus: payment.order.status,
      loyaltyPointsAwarded: payment.order.loyaltyPointsAwarded,
    };
  }

  async findByOrderId(orderId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      include: { order: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!payments.length) {
      throw new NotFoundException(`Không tìm thấy thông tin thanh toán cho đơn hàng ${orderId}`);
    }
    return payments;
  }

  private findPaymentByKey(idempotencyKey: string): Promise<PaymentWithOrder | null> {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey },
      include: { order: true },
    });
  }
}
