import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignInDto {
	constructor() {
		this.message = '';
		this.signature = '';
	}

	@ApiProperty({
		example: 'Signing this message confirms your control over the wallet address: ${address} valid: ${valid} expired: ${expired}',
		description: '',
	})
	@IsString()
	message: string;

	@ApiProperty({ example: '0x...', description: '' })
	@IsString()
	signature: string;
}
