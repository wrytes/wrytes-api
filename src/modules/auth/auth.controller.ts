import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiSecurity,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify magic link and receive API key' })
  @ApiQuery({ name: 'token', required: true, description: '32-character magic link token', example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' })
  @ApiResponse({
    status: 200,
    description: 'API key created successfully',
    schema: {
      example: {
        apiKey: 'wrt_kid_cm9abc123.supersecretkey456xyz',
        expiresAt: '2026-07-05T00:00:00.000Z',
        message: 'API key created successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired magic link token' })
  async verifyMagicLink(@Query('token') token: string) {
    const result = await this.authService.verifyMagicLink(token);
    return {
      apiKey: result.apiKey,
      expiresAt: result.expiresAt,
      message: 'API key created successfully',
    };
  }

  @Get('me')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 'cm9abc123',
        telegramHandle: 'wrytes_user',
        notificationsEnabled: true,
        scopes: ['USER', 'OFFRAMP'],
        wallets: [{ address: '0xd8dA...', label: null }],
        profile: { firstName: 'Alice', lastName: 'Smith', businessName: null, isVerified: false },
      },
    },
  })
  async getMe(@CurrentUser() user: User) {
    return this.authService.getCurrentUser(user.id);
  }

  @Get('keys')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'List API keys' })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    schema: {
      example: {
        keys: [
          {
            id: 'cm9abc123def456',
            keyId: 'cm9kid789',
            expiresAt: '2026-07-05T00:00:00.000Z',
            revokedAt: null,
            lastUsedAt: '2026-04-05T10:30:00.000Z',
            createdAt: '2026-01-15T08:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listApiKeys(@CurrentUser() user: User) {
    const keys = await this.authService.listApiKeys(user.id);
    return { keys };
  }

  @Get('scopes')
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'List scopes for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of scopes',
    schema: {
      example: {
        scopes: ['USER', 'OFFRAMP', 'ALCHEMY'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getScopes(@CurrentUser() user: User) {
    const scopes = await this.authService.getUserScopes(user.id);
    return { scopes };
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('api-key')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['keyId'],
      properties: { keyId: { type: 'string', example: 'cm9kid789' } },
      example: { keyId: 'cm9kid789' },
    },
  })
  @ApiResponse({ status: 200, description: 'API key revoked successfully', schema: { example: { message: 'API key revoked successfully' } } })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(@CurrentUser() user: User, @Body('keyId') keyId: string) {
    await this.authService.revokeApiKey(user.id, keyId);
    return { message: 'API key revoked successfully' };
  }
}
