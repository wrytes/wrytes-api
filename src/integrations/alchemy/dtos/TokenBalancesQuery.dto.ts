import { IsOptional, IsString } from 'class-validator';

export class TokenBalancesQueryDto {
  @IsOptional()
  @IsString()
  pageKey?: string;
}
