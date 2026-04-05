import {
  Controller, Get, Post, Put, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiParam } from '@nestjs/swagger';
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
  @ApiResponse({ status: 200 })
  list(@CurrentUser() user: User) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a bank account' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 409, description: 'Label already in use' })
  create(@CurrentUser() user: User, @Body() dto: CreateBankAccountDto) {
    return this.service.create(user.id, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bank account metadata' })
  @ApiParam({ name: 'id' })
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
