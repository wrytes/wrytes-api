import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OffRampExecutionsService } from './offramp-executions.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Off-Ramp Executions')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('OFFRAMP')
@Controller('offramp/executions')
export class OffRampExecutionsController {
  constructor(private readonly service: OffRampExecutionsService) {}

  @Get()
  @ApiOperation({ summary: 'List own executions (latest 50)' })
  @ApiQuery({ name: 'routeId', required: false })
  list(@CurrentUser() user: User, @Query('routeId') routeId?: string) {
    return this.service.list(user.id, routeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single execution' })
  @ApiParam({ name: 'id' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(id, user.id);
  }
}
