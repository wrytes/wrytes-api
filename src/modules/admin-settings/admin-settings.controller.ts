import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiBody } from '@nestjs/swagger';
import { AdminSettingsService, UpdateTokenMinDto, CreateTokenMinDto } from './admin-settings.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';

@ApiTags('Admin Settings')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly service: AdminSettingsService) {}

  @Get('token-minimums')
  @ApiOperation({ summary: 'List global token minimum amounts' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        { symbol: 'ETH', minAmount: '0.001', updatedAt: '2026-04-19T00:00:00.000Z' },
        { symbol: 'USDC', minAmount: '5', updatedAt: '2026-04-19T00:00:00.000Z' },
        { symbol: 'USDT', minAmount: '5', updatedAt: '2026-04-19T00:00:00.000Z' },
      ],
    },
  })
  list() {
    return this.service.list();
  }

  @Post('token-minimums')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new token minimum amount' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['symbol', 'minAmount'],
      properties: {
        symbol: { type: 'string', example: 'ETH' },
        minAmount: { type: 'string', example: '0.001' },
      },
    },
  })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Symbol already exists' })
  addToken(@Body() dto: CreateTokenMinDto) {
    return this.service.create(dto.symbol.toUpperCase(), dto.minAmount);
  }

  @Put('token-minimums/:symbol')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update minimum amount for a token symbol' })
  @ApiParam({ name: 'symbol', example: 'ETH' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['minAmount'],
      properties: { minAmount: { type: 'string', example: '0.005' } },
    },
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Token symbol not found' })
  update(@Param('symbol') symbol: string, @Body() dto: UpdateTokenMinDto) {
    return this.service.update(symbol.toUpperCase(), dto.minAmount);
  }
}
