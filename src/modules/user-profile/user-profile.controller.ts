import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';
import { UserProfileService, UpsertProfileDto } from './user-profile.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('User Profile')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@Controller('user/profile')
export class UserProfileController {
  constructor(private readonly service: UserProfileService) {}

  @Get()
  @RequireScopes('USER')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async get(@CurrentUser() user: User) {
    return this.service.get(user.id);
  }

  @Put()
  @RequireScopes('USER')
  @ApiOperation({ summary: 'Create or update own profile' })
  @ApiResponse({ status: 200, description: 'Profile saved' })
  async upsert(@CurrentUser() user: User, @Body() dto: UpsertProfileDto) {
    return this.service.upsert(user.id, dto);
  }

  @Post(':userId/verify')
  @RequireScopes('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Mark user profile as verified' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Profile verified' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async verify(@Param('userId') userId: string) {
    return this.service.verify(userId);
  }

  @Delete(':userId/verify')
  @RequireScopes('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Revoke user profile verification' })
  @ApiParam({ name: 'userId', description: 'Target user ID' })
  @ApiResponse({ status: 200, description: 'Verification revoked' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async unverify(@Param('userId') userId: string) {
    return this.service.unverify(userId);
  }
}
