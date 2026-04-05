import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiQuery } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'routeId', required: false, example: 'cm9rte001abc' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'cm9exe001xyz',
          routeId: 'cm9rte001abc',
          userId: 'cm9usr789ghi012',
          status: 'COMPLETED',
          tokenSymbol: 'USDC',
          tokenAmount: '1250.000000000000000000',
          onChainTxHash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
          krakenDepositRef: 'QABC1234',
          krakenOrderId: 'OID-XXXXX-YYYYY',
          fiatAmount: '1147.50000000',
          krakenWithdrawalId: 'WID-ZZZZZ-AAAAA',
          error: null,
          createdAt: '2026-04-04T14:00:00.000Z',
          updatedAt: '2026-04-04T14:45:00.000Z',
        },
      ],
    },
  })
  list(@CurrentUser() user: User, @Query('routeId') routeId?: string) {
    return this.service.list(user.id, routeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single execution' })
  @ApiParam({ name: 'id', example: 'cm9exe001xyz' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        id: 'cm9exe001xyz',
        routeId: 'cm9rte001abc',
        userId: 'cm9usr789ghi012',
        status: 'COMPLETED',
        tokenSymbol: 'USDC',
        tokenAmount: '1250.000000000000000000',
        onChainTxHash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
        krakenDepositRef: 'QABC1234',
        krakenOrderId: 'OID-XXXXX-YYYYY',
        fiatAmount: '1147.50000000',
        krakenWithdrawalId: 'WID-ZZZZZ-AAAAA',
        error: null,
        createdAt: '2026-04-04T14:00:00.000Z',
        updatedAt: '2026-04-04T14:45:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.get(id, user.id);
  }
}
