import {
  Controller, Get, Post, Patch, Body, Param,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiBody } from '@nestjs/swagger';
import { OffRampRouteStatus } from '@prisma/client';
import { OffRampRoutesService, CreateRouteDto } from './offramp-routes.service';
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
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single route with deposit address' })
  @ApiParam({ name: 'id' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(id, user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an off-ramp route',
    description: 'Automatically provisions a dedicated Safe wallet. The returned `depositAddress` is where the member sends crypto.',
  })
  @ApiResponse({ status: 201, description: 'Route created with deposit address' })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  create(@CurrentUser() user: User, @Body() dto: CreateRouteDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a route (stops monitoring)' })
  @ApiParam({ name: 'id' })
  pause(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.setStatus(id, user.id, OffRampRouteStatus.PAUSED);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-activate a paused route' })
  @ApiParam({ name: 'id' })
  activate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.setStatus(id, user.id, OffRampRouteStatus.ACTIVE);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a route (permanent)' })
  @ApiParam({ name: 'id' })
  archive(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.setStatus(id, user.id, OffRampRouteStatus.ARCHIVED);
  }

  @Patch(':id/min-trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update minimum trigger amount' })
  @ApiParam({ name: 'id' })
  @ApiBody({ schema: { type: 'object', properties: { amount: { type: 'string', example: '50' } } } })
  updateMinTrigger(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('amount') amount: string,
  ) {
    return this.service.updateMinTrigger(id, user.id, amount);
  }
}
