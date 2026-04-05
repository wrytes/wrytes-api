import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OffRampExecutionsService } from './offramp-executions.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationEvent } from '../../common/events/notification.events';
import type { User } from '@prisma/client';

@ApiTags('Off-Ramp Executions')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('OFFRAMP')
@Controller('offramp/executions')
export class OffRampExecutionsController {
  constructor(
    private readonly service: OffRampExecutionsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
          status: 'SETTLED',
          tokenSymbol: 'USDC',
          tokenAmount: '1250.000000000000000000',
          depositTxHash: '0xabc1230000000000000000000000000000000000000000000000000000000000',
          onChainTxHash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
          krakenDepositRef: 'QABC1234',
          krakenOrderId: 'OID-XXXXX-YYYYY',
          fiatAmount: '1147.50000000',
          krakenWithdrawalId: 'WID-ZZZZZ-AAAAA',
          bankTransferRef: 'PF-2026-04-05-001',
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

  @Get('pending-transfer')
  @RequireScopes('ADMIN')
  @ApiOperation({ summary: 'List executions awaiting manual bank transfer (admin)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'cm9exe001xyz',
          status: 'PENDING_BANK_TRANSFER',
          fiatAmount: '1147.50000000',
          tokenSymbol: 'USDC',
          tokenAmount: '1250.000000000000000000',
          userId: 'cm9usr789ghi012',
          route: {
            targetCurrency: 'CHF',
            bankAccount: { label: 'main', iban: 'CH56 0483 5012 3456 7800 9' },
          },
          updatedAt: '2026-04-05T10:00:00.000Z',
        },
      ],
    },
  })
  listPendingBankTransfers() {
    return this.service.listPendingBankTransfers();
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
        status: 'SETTLED',
        tokenSymbol: 'USDC',
        tokenAmount: '1250.000000000000000000',
        depositTxHash: '0xabc1230000000000000000000000000000000000000000000000000000000000',
        onChainTxHash: '0xdeadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
        krakenDepositRef: 'QABC1234',
        krakenOrderId: 'OID-XXXXX-YYYYY',
        fiatAmount: '1147.50000000',
        krakenWithdrawalId: 'WID-ZZZZZ-AAAAA',
        bankTransferRef: 'PF-2026-04-05-001',
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

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('ADMIN')
  @ApiOperation({ summary: 'Delete an execution (admin only)' })
  @ApiParam({ name: 'id', example: 'cm9exe001xyz' })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Patch(':id/settle')
  @HttpCode(HttpStatus.OK)
  @RequireScopes('ADMIN')
  @ApiOperation({ summary: 'Mark execution as settled after manual bank transfer (admin)' })
  @ApiParam({ name: 'id', example: 'cm9exe001xyz' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        bankTransferRef: { type: 'string', example: 'PF-2026-04-05-001', description: 'Optional PostFinance transfer reference' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Execution is not in PENDING_BANK_TRANSFER status' })
  async settle(@Param('id') id: string, @Body('bankTransferRef') bankTransferRef?: string) {
    const execution = await this.service.settle(id, bankTransferRef);
    this.eventEmitter.emit(
      'notification',
      new NotificationEvent(execution.userId, 'Payment sent', `Your bank transfer of ${execution.fiatAmount} has been sent. Ref: ${bankTransferRef ?? 'N/A'}`, 'success'),
    );
    return execution;
  }
}
