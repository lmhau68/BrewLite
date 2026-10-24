import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsIn,
  Min,
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SIZE_IDS } from '../../products/menu-options.js';

export class CreateOrderToppingDto {
  @IsString({ message: 'topping id phải là chuỗi' })
  @IsNotEmpty({ message: 'topping id không được để trống' })
  id!: string;
}

export class CreateOrderItemDto {
  @IsInt({ message: 'productId phải là số nguyên' })
  @IsNotEmpty({ message: 'productId không được để trống' })
  productId!: number;

  @IsString({ message: 'size phải là chuỗi ký tự' })
  @IsIn(SIZE_IDS, { message: `size phải là một trong các giá trị: ${SIZE_IDS.join(', ')}` })
  size!: string;

  @IsOptional()
  @IsArray({ message: 'toppings phải là mảng' })
  @ArrayMaxSize(10, { message: 'Tối đa 10 topping cho mỗi món' })
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

  @IsArray({ message: 'Danh sách sản phẩm phải là mảng' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  promotionCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

