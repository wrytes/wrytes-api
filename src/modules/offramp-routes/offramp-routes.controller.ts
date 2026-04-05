import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiBody } from '@nestjs/swagger';
import { OffRampRoutesService, CreateRouteDto, UpdateRouteDto } from './offramp-routes.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Off-Ramp Routes')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('OFFRAMP')
@Controller('offramp/routes')
export class OffRampRoutesController {
  constructor(private readonly service: OffRampRoutesService) {}

  @Get()
  @ApiOperation({ summary: 'List own off-ramp routes' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'cm9rte001abc',
          userId: 'cm9usr789ghi012',
          label: 'monthly-salary',
          targetCurrency: 'CHF',
          bankAccountId: 'cm9ba001abc',
          minTriggerAmount: '50',
          status: 'ACTIVE',
          depositAddress: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
          safeWallet: { address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', deployed: true },
          bankAccount: { currency: 'CHF', label: 'main' },
          createdAt: '2026-02-01T08:00:00.000Z',
          updatedAt: '2026-02-01T08:00:00.000Z',
        },
      ],
    },
  })
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single route with deposit address' })
  @ApiParam({ name: 'id', example: 'cm9rte001abc' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 'cm9rte001abc',
        userId: 'cm9usr789ghi012',
        label: 'monthly-salary',
        targetCurrency: 'CHF',
        bankAccountId: 'cm9ba001abc',
        minTriggerAmount: '50',
        status: 'ACTIVE',
        depositAddress: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        safeWallet: { address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', deployed: true, chainId: 1 },
        bankAccount: { currency: 'CHF', label: 'main' },
        createdAt: '2026-02-01T08:00:00.000Z',
        updatedAt: '2026-02-01T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Route not found' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(id, user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an off-ramp route',
    description: 'Automatically provisions a dedicated Safe wallet. The returned `depositAddress` is where the member sends crypto.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['label', 'targetCurrency', 'bankAccountId'],
      properties: {
        label: { type: 'string', example: 'monthly-salary' },
        targetCurrency: { type: 'string', enum: ['CHF', 'EUR'], example: 'CHF' },
        bankAccountId: { type: 'string', example: 'cm9ba001abc' },
        minTriggerAmount: { type: 'string', example: '50', description: 'Minimum token amount (in USD equivalent) to trigger execution. Defaults to 0.' },
      },
      example: {
        label: 'monthly-salary',
        targetCurrency: 'CHF',
        bankAccountId: 'cm9ba001abc',
        minTriggerAmount: '50',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Route created with deposit address',
    schema: {
      example: {
        id: 'cm9rte001abc',
        userId: 'cm9usr789ghi012',
        label: 'monthly-salary',
        targetCurrency: 'CHF',
        bankAccountId: 'cm9ba001abc',
        minTriggerAmount: '50',
        status: 'ACTIVE',
        depositAddress: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12',
        safeWallet: { address: '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12', deployed: false },
        bankAccount: { currency: 'CHF', label: 'main' },
        createdAt: '2026-04-05T10:00:00.000Z',
        updatedAt: '2026-04-05T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  create(@CurrentUser() user: User, @Body() dto: CreateRouteDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active route (stops monitoring)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 400, description: 'Route is already paused or archived' })
  pause(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.pause(id, user.id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a paused route' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 400, description: 'Route is already active or archived' })
  activate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.activate(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('ADMIN')
  @ApiOperation({ summary: 'Delete a route (admin only)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update route label and/or minimum trigger amount' })
  @ApiParam({ name: 'id', example: 'cm9rte001abc' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        label: { type: 'string', example: 'quarterly-bonus' },
        minTriggerAmount: { type: 'string', example: '100' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.service.update(id, user.id, dto);
  }
}
