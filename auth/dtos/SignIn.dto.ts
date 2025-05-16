import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SignInDto {
	constructor() {
		this.message = '';
		this.signature = '';
	}

	@ApiProperty({ example: '', description: '' })
	@IsString()
	message: string;

	@ApiProperty({ example: Date.now(), description: '' })
	@IsString()
	signature: string;
}
