import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateLinkTokenDto {
  @ApiProperty({
    description: 'EIP-55 checksummed Ethereum address',
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'EIP-191 signature over the ownership message',
    example: '0x...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'The exact message that was signed (must contain the address)',
    example: 'Link wallet to Wrytes\n\nAddress: 0x...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
