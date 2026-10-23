import { IsInt, IsNotEmpty, IsString, IsIn, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId!: number;

  @IsString({ message: 'size phải là chuỗi ký tự' })
  @IsIn(['S', 'M', 'L'], { message: 'size phải là một trong các giá trị: S, M, L' })
  size!: string;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  qty!: number;

  @IsOptional()
  price?: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt({ message: 'userId phải là số nguyên' })
  userId?: number;

  @IsArray({ message: 'Danh sách sản phẩm phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

