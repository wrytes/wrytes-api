import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateMessageDto } from './dtos/CreateMessage.dto';
import { SignInDto } from './dtos/SignIn.dto';

@ApiTags('Auth Controller')
@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@ApiResponse({
		description: '',
	})
	@Post('message')
	message(@Body() { address, expired, valid }: CreateMessageDto) {
		return this.authService.createMessage({ address, expired, valid });
	}

	@ApiResponse({
		description: '',
	})
	@Post('signIn')
	async signIn(@Body() { message, signature }: SignInDto) {
		return await this.authService.signIn({ message, signature });
	}
}
