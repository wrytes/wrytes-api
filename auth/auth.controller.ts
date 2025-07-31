import { Body, Controller, Post, Get, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../users/users.service';
import { ApiResponse, ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateMessageDto } from './dtos/CreateMessage.dto';
import { SignInDto } from './dtos/SignIn.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly userService: UserService
	) {}

	@Public()
	@Post('message')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Generate authentication message',
		description: 'Creates a message that needs to be signed by the wallet to authenticate',
	})
	@ApiResponse({
		status: 200,
		description: 'Authentication message generated successfully',
		schema: {
			type: 'string',
			example:
				'Signing this message confirms your control over the wallet address: 0x123... valid: 1672531200000 expired: 1672534800000',
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Invalid wallet address provided',
	})
	createMessage(@Body() { address, expired, valid }: CreateMessageDto) {
		return this.authService.createMessage({ address, expired, valid });
	}

	@Public()
	@Post('signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Sign in with wallet signature',
		description: 'Authenticates user by verifying wallet signature and returns JWT token',
	})
	@ApiResponse({
		status: 200,
		description: 'Authentication successful',
		schema: {
			type: 'object',
			properties: {
				accessToken: {
					type: 'string',
					example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
				},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: 'Invalid signature or message format',
	})
	async signIn(@Body() signInDto: SignInDto) {
		return this.authService.signIn(signInDto);
	}

	@Get('me')
	@ApiBearerAuth()
	@ApiOperation({
		summary: 'Get current user profile',
		description: 'Returns the profile information of the currently authenticated user',
	})
	@ApiResponse({
		status: 200,
		description: 'Current user profile retrieved successfully',
	})
	@ApiResponse({
		status: 401,
		description: 'User not authenticated',
	})
	@ApiResponse({
		status: 404,
		description: 'User profile not found',
	})
	async getCurrentUser(@Request() req) {
		if (!req.user?.address) {
			throw new Error('User not authenticated');
		}

		const user = await this.userService.getUserByWallet(req.user.address);
		if (!user) {
			throw new Error('User profile not found');
		}

		// Return user without sensitive data
		const { userRoles, ...userProfile } = user;
		return {
			...userProfile,
			roles: userRoles.map((ur) => ({
				id: ur.role.id,
				name: ur.role.name,
				description: ur.role.description,
				grantedAt: ur.grantedAt,
				expiresAt: ur.expiresAt,
			})),
		};
	}

	@Post('refresh')
	@ApiBearerAuth()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: 'Refresh JWT token',
		description: 'Refreshes the JWT token for the authenticated user',
	})
	@ApiResponse({
		status: 200,
		description: 'Token refreshed successfully',
	})
	@ApiResponse({
		status: 401,
		description: 'User not authenticated',
	})
	async refreshToken(@Request() req) {
		if (!req.user?.address) {
			throw new Error('User not authenticated');
		}

		// Update last login and generate new token
		const user = await this.userService.getUserByWallet(req.user.address);
		if (user) {
			await this.userService.updateLastLogin(user.id);
		}

		return this.authService.generateTokenForUser(req.user.address, user);
	}
}
