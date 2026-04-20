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
          id: 'cm9rt001abc',
          label: 'monthly-salary',
          targetCurrency: 'CHF',
          bankAccountId: 'cm9ba001abc',
          status: 'ACTIVE',
          depositAddress: '0xSafeWalletAddress',
          safeWallet: { address: '0xSafeWalletAddress', deployed: true },
          bankAccount: { currency: 'CHF', label: 'main' },
          createdAt: '2026-01-15T09:00:00.000Z',
        },
      ],
    },
  })
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single route with deposit address' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 'cm9rt001abc',
        label: 'monthly-salary',
        targetCurrency: 'CHF',
        bankAccountId: 'cm9ba001abc',
        status: 'ACTIVE',
        depositAddress: '0xSafeWalletAddress',
        safeWallet: { address: '0xSafeWalletAddress', deployed: true, chainId: 1 },
        bankAccount: { currency: 'CHF', label: 'main' },
        createdAt: '2026-01-15T09:00:00.000Z',
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
    description: 'Automatically provisions a dedicated Safe wallet. The returned `depositAddress` is where the user sends crypto.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['label', 'targetCurrency', 'bankAccountId'],
      properties: {
        label: { type: 'string', example: 'monthly-salary' },
        targetCurrency: { type: 'string', enum: ['CHF', 'EUR'], example: 'CHF' },
        bankAccountId: { type: 'string', example: 'cm9ba001abc' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Route created with a provisioned Safe wallet deposit address' })
  @ApiResponse({ status: 400, description: 'Bank account currency does not match targetCurrency' })
  @ApiResponse({ status: 404, description: 'Bank account not found' })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  create(@CurrentUser() user: User, @Body() dto: CreateRouteDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause an active route' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Route paused' })
  @ApiResponse({ status: 400, description: 'Route is already paused' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  pause(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.pause(id, user.id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a paused route' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Route activated' })
  @ApiResponse({ status: 400, description: 'Route is already active' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  activate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.activate(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('ADMIN')
  @ApiOperation({
    summary: 'Delete a route (admin only)',
    description: 'Requires the ADMIN scope. Permanently removes the route and stops monitoring its deposit address.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Route deleted' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update route label' })
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { label: { type: 'string', example: 'quarterly-bonus' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Route updated' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.service.update(id, user.id, dto);
  }
}
