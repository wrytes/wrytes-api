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
	ApiBody,
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
	@ApiOperation({ summary: 'Get own profile' })
	@ApiResponse({
		status: 200,
		description: 'Profile returned',
		schema: {
			example: {
				id: 'cm9abc123def456',
				userId: 'cm9usr789ghi012',
				firstName: 'Jane',
				lastName: 'Doe',
				businessName: null,
				dateOfBirth: '1990-06-15T00:00:00.000Z',
				street: 'Bahnhofstrasse 1',
				city: 'Zurich',
				postalCode: '8001',
				country: 'CH',
				isVerified: true,
				verifiedAt: '2026-03-01T12:00:00.000Z',
				createdAt: '2026-01-10T09:00:00.000Z',
				updatedAt: '2026-03-01T12:00:00.000Z',
			},
		},
	})
	@ApiResponse({ status: 404, description: 'Profile not found' })
	async get(@CurrentUser() user: User) {
		return this.service.get(user.id);
	}

	@Put()
	@ApiOperation({ summary: 'Create or update own profile' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				firstName: { type: 'string', example: 'Jane' },
				lastName: { type: 'string', example: 'Doe' },
				businessName: { type: 'string', example: null, nullable: true },
				dateOfBirth: {
					type: 'string',
					format: 'date',
					example: '1990-06-15',
				},
				street: { type: 'string', example: 'Bahnhofstrasse 1' },
				city: { type: 'string', example: 'Zurich' },
				postalCode: { type: 'string', example: '8001' },
				country: {
					type: 'string',
					example: 'CH',
					description: 'ISO 3166-1 alpha-2',
				},
			},
			example: {
				firstName: 'Jane',
				lastName: 'Doe',
				dateOfBirth: '1990-06-15',
				street: 'Bahnhofstrasse 1',
				city: 'Zurich',
				postalCode: '8001',
				country: 'CH',
			},
		},
	})
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
