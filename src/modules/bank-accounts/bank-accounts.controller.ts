import {
  Controller, Get, Post, Put, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam, ApiBody } from '@nestjs/swagger';
import { BankAccountsService, CreateBankAccountDto, UpdateBankAccountDto } from './bank-accounts.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Bank Accounts')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('USER')
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List own bank accounts (IBAN masked)' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: 'cm9ba001abc',
          userId: 'cm9usr789ghi012',
          iban: 'CH56****5489',
          bic: 'POFICHBEXXX',
          holderName: 'Jane Doe',
          currency: 'CHF',
          label: 'main',
          isDefault: true,
          createdAt: '2026-01-15T09:00:00.000Z',
          updatedAt: '2026-01-15T09:00:00.000Z',
        },
      ],
    },
  })
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a bank account' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['iban', 'bic', 'holderName', 'currency'],
      properties: {
        iban: { type: 'string', example: 'CH5604835012345678009' },
        bic: { type: 'string', example: 'POFICHBEXXX' },
        holderName: { type: 'string', example: 'Jane Doe' },
        currency: { type: 'string', enum: ['CHF', 'EUR'], example: 'CHF' },
        label: { type: 'string', example: 'main', description: 'Defaults to "default"' },
        isDefault: { type: 'boolean', example: true },
      },
      example: {
        iban: 'CH5604835012345678009',
        bic: 'POFICHBEXXX',
        holderName: 'Jane Doe',
        currency: 'CHF',
        label: 'main',
        isDefault: true,
      },
    },
  })
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        id: 'cm9ba001abc',
        userId: 'cm9usr789ghi012',
        iban: 'CH56****8009',
        bic: 'POFICHBEXXX',
        holderName: 'Jane Doe',
        currency: 'CHF',
        label: 'main',
        isDefault: true,
        createdAt: '2026-04-05T10:00:00.000Z',
        updatedAt: '2026-04-05T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  create(@CurrentUser() user: User, @Body() dto: CreateBankAccountDto) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bank account metadata' })
  @ApiParam({ name: 'id', example: 'cm9ba001abc' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        bic: { type: 'string', example: 'POFICHBEXXX' },
        holderName: { type: 'string', example: 'Jane Doe' },
        label: { type: 'string', example: 'savings' },
        isDefault: { type: 'boolean', example: false },
      },
      example: { label: 'savings', isDefault: false },
    },
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 409, description: 'Account linked to an active route' })
  async remove(@CurrentUser() user: User, @Param('id') id: string) {
    await this.service.remove(id, user.id);
  }

  @Post(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set as default bank account' })
  @ApiParam({ name: 'id' })
  setDefault(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.setDefault(id, user.id);
  }
}
