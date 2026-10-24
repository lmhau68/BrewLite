import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsIn,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
  MinLength,
  ArrayUnique,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderToppingDto {
  @IsString({ message: ' topping.id phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'topping.id không được để trống' })
  id!: string;
}

export class CreateOrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId!: number;

  @IsString({ message: 'size phải là chuỗi ký tự' })
  @IsIn(['S', 'M', 'L'], { message: 'size phải là một trong các giá trị: S, M, L' })
  size!: string;

  @IsOptional()
  @IsArray({ message: 'toppings phải là mảng' })
  @ArrayUnique({ message: 'toppings không được trùng lặp' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderToppingDto)
  toppings?: CreateOrderToppingDto[];

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn hoặc bằng 1' })
  qty!: number;
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt({ message: 'userId phải là số nguyên' })
  userId?: number;

  @IsOptional()
  @IsString({ message: 'customerName phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'Tên người nhận không được dài quá 100 ký tự' })
  customerName?: string;

  @IsOptional()
  @IsString({ message: 'customerPhone phải là chuỗi ký tự' })
  @MaxLength(20, { message: 'Số điện thoại không được dài quá 20 ký tự' })
  customerPhone?: string;

  @IsOptional()
  @IsString({ message: 'address phải là chuỗi ký tự' })
  @MaxLength(200, { message: 'Địa chỉ không được dài quá 200 ký tự' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'note phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Ghi chú không được dài quá 500 ký tự' })
  note?: string;

  @IsArray({ message: 'Danh sách sản phẩm phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  promotionCode?: string;
}
