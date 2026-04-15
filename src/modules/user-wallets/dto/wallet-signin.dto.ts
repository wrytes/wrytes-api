import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WalletSigninDto {
  @ApiProperty({ example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'The exact message returned by /auth/challenge' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'EIP-191 signature over the challenge message', example: '0x...' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
