import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WalletChallengeDto {
  @ApiProperty({
    description: 'Ethereum wallet address requesting a sign-in challenge',
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}
