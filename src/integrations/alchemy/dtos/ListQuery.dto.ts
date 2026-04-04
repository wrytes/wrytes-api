import { IsOptional, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['from', 'to'])
  direction?: 'from' | 'to' = 'from';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 50;

  @IsOptional()
  @IsString()
  pageKey?: string;
}
