import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Exchange } from '@prisma/client';
import type { User } from '@prisma/client';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExchangeCredentialsService } from './exchange-credentials.service';

@ApiTags('Exchange Credentials')
@Controller('exchange-credentials')
@UseGuards(ApiKeyGuard, ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('USER')
export class ExchangeCredentialsController {
  constructor(private readonly service: ExchangeCredentialsService) {}

  @Get()
  @ApiOperation({ summary: 'List configured exchanges for the current user' })
  list(@CurrentUser() user: User) {
    return this.service.listForUser(user.id);
  }

  @Post('kraken')
  @ApiOperation({ summary: 'Save or update Kraken API credentials' })
  @ApiBody({
    schema: {
      properties: {
        publicKey: { type: 'string' },
        privateKey: { type: 'string' },
        addressKey: { type: 'string' },
        label: { type: 'string', default: 'default' },
      },
      required: ['publicKey', 'privateKey'],
    },
  })
  upsertKraken(
    @CurrentUser() user: User,
    @Body() body: { publicKey: string; privateKey: string; addressKey?: string; label?: string },
  ) {
    const { label, ...credentials } = body;
    return this.service.upsert(user.id, Exchange.KRAKEN, credentials, label);
  }

  @Post('deribit')
  @ApiOperation({ summary: 'Save or update Deribit API credentials' })
  @ApiBody({
    schema: {
      properties: {
        clientId: { type: 'string' },
        clientSecret: { type: 'string' },
        label: { type: 'string', default: 'default' },
      },
      required: ['clientId', 'clientSecret'],
    },
  })
  upsertDeribit(
    @CurrentUser() user: User,
    @Body() body: { clientId: string; clientSecret: string; label?: string },
  ) {
    const { label, ...credentials } = body;
    return this.service.upsert(user.id, Exchange.DERIBIT, credentials, label);
  }

  @Delete(':exchange/:label')
  @ApiOperation({ summary: 'Delete credentials for an exchange and label' })
  @ApiParam({ name: 'exchange', enum: Exchange })
  @ApiParam({ name: 'label', example: 'default' })
  delete(
    @CurrentUser() user: User,
    @Param('exchange') exchange: Exchange,
    @Param('label') label: string,
  ) {
    return this.service.delete(user.id, exchange, label);
  }
}
