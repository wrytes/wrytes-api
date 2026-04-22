import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { TransferClassification, AccountType, NormalBalance } from '@prisma/client';
import { AccountingService } from './accounting.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Accounting')
@ApiSecurity('api-key')
@UseGuards(ScopesGuard)
@RequireScopes('USER')
@Controller('accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  // ---------------------------------------------------------------------------
  // Addresses
  // ---------------------------------------------------------------------------

  @Post('addresses')
  @ApiOperation({ summary: 'Add a wallet address to track' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['address', 'chain'],
      properties: {
        address: { type: 'string', example: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' },
        chain: { type: 'string', example: 'eth-mainnet', description: 'Alchemy chain slug' },
        label: { type: 'string', example: 'Treasury' },
      },
    },
  })
  addAddress(
    @CurrentUser() user: User,
    @Body() body: { address: string; chain: string; label?: string },
  ) {
    return this.service.addAddress(user.id, body.address, body.chain, body.label);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'List tracked wallet addresses' })
  listAddresses(@CurrentUser() user: User) {
    return this.service.listAddresses(user.id);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a tracked address and its transfers' })
  @ApiParam({ name: 'id' })
  removeAddress(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.removeAddress(user.id, id);
  }

  @Post('addresses/:id/sync')
  @ApiOperation({ summary: 'Sync all token transfers from Alchemy for this address' })
  @ApiParam({ name: 'id' })
  syncAddress(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.syncAddress(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // Transfers
  // ---------------------------------------------------------------------------

  @Get('addresses/:id/transfers')
  @ApiOperation({ summary: 'List transfers for a tracked address' })
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'classification', required: false, enum: TransferClassification })
  @ApiQuery({ name: 'direction', required: false, enum: ['IN', 'OUT'] })
  @ApiQuery({ name: 'showHidden', required: false, type: Boolean })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortDir', required: false, enum: ['asc', 'desc'] })
  getTransfers(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query('search') search?: string,
    @Query('classification') classification?: string,
    @Query('direction') direction?: string,
    @Query('showHidden') showHidden?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    return this.service.getTransfers(user.id, id, {
      search,
      classification,
      direction,
      showHidden: showHidden === 'true',
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
      sortBy,
      sortDir: (sortDir as 'asc' | 'desc') ?? 'desc',
    });
  }

  @Get('addresses/:id/summary')
  @ApiOperation({ summary: 'Accounting summary grouped by token (assets/liabilities)' })
  @ApiParam({ name: 'id' })
  getSummary(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getSummary(user.id, id);
  }

  @Get('addresses/:id/token-balances')
  @ApiOperation({ summary: 'Per-token IN/OUT balance breakdown for a tracked address' })
  @ApiParam({ name: 'id' })
  getTokenBalances(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getTokenBalances(user.id, id);
  }

  @Patch('transfers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update classification, hidden flag, or notes on a transfer' })
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        classification: { type: 'string', enum: Object.values(TransferClassification) },
        isHidden: { type: 'boolean' },
        chfValue: { type: 'string', nullable: true },
        notes: { type: 'string', nullable: true },
      },
    },
  })
  updateTransfer(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { classification?: TransferClassification; isHidden?: boolean; chfValue?: string | null; notes?: string | null },
  ) {
    return this.service.updateTransfer(user.id, id, body);
  }

  // ---------------------------------------------------------------------------
  // Blacklist
  // ---------------------------------------------------------------------------

  @Get('blacklist')
  @ApiOperation({ summary: 'List globally blacklisted tokens (scam/spam)' })
  getBlacklist() {
    return this.service.getBlacklist();
  }

  @Post('blacklist')
  @ApiOperation({ summary: 'Add a token to the global blacklist' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tokenAddress', 'chainId'],
      properties: {
        tokenAddress: { type: 'string' },
        chainId: { type: 'number' },
        tokenSymbol: { type: 'string' },
        reason: { type: 'string' },
      },
    },
  })
  addToBlacklist(
    @CurrentUser() user: User,
    @Body() body: { tokenAddress: string; chainId: number; tokenSymbol?: string; reason?: string },
  ) {
    return this.service.addToBlacklist(user.id, body.tokenAddress, body.chainId, body.tokenSymbol, body.reason);
  }

  @Delete('blacklist/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a token from the blacklist' })
  @ApiParam({ name: 'id' })
  removeFromBlacklist(@Param('id') id: string) {
    return this.service.removeFromBlacklist(id);
  }

  // ---------------------------------------------------------------------------
  // Chart of accounts
  // ---------------------------------------------------------------------------

  @Get('accounts')
  @ApiOperation({ summary: 'List chart of accounts for the current user' })
  getAccounts(@CurrentUser() user: User) {
    return this.service.getAccounts(user.id);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create a new account' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'type', 'normalBalance'],
      properties: {
        name:          { type: 'string' },
        code:          { type: 'string' },
        type:          { type: 'string', enum: Object.values(AccountType) },
        normalBalance: { type: 'string', enum: Object.values(NormalBalance) },
        description:   { type: 'string' },
      },
    },
  })
  createAccount(
    @CurrentUser() user: User,
    @Body() body: { name: string; code?: string; type: AccountType; normalBalance: NormalBalance; description?: string },
  ) {
    return this.service.createAccount(user.id, body);
  }

  @Patch('accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update account name, code, or description' })
  @ApiParam({ name: 'id' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name:        { type: 'string' },
        code:        { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  updateAccount(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { name?: string; code?: string; description?: string },
  ) {
    return this.service.updateAccount(user.id, id, body);
  }

  @Delete('accounts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an account (only if no journal lines reference it)' })
  @ApiParam({ name: 'id' })
  deleteAccount(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.deleteAccount(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // Classification templates
  // ---------------------------------------------------------------------------

  @Get('templates')
  @ApiOperation({ summary: 'List all classification templates (defaults + user overrides)' })
  getTemplates(@CurrentUser() user: User) {
    return this.service.getTemplates(user.id);
  }

  @Put('templates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upsert a classification template override' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['classification', 'direction', 'debitAccountId', 'creditAccountId'],
      properties: {
        classification:  { type: 'string', enum: Object.values(TransferClassification) },
        direction:       { type: 'string', enum: ['IN', 'OUT', 'ANY'] },
        debitAccountId:  { type: 'string' },
        creditAccountId: { type: 'string' },
      },
    },
  })
  upsertTemplate(
    @CurrentUser() user: User,
    @Body() body: { classification: TransferClassification; direction: string; debitAccountId: string; creditAccountId: string },
  ) {
    return this.service.upsertTemplate(user.id, body);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a template override (reverts to default)' })
  @ApiParam({ name: 'id' })
  deleteTemplate(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.deleteTemplate(user.id, id);
  }

  // ---------------------------------------------------------------------------
  // Trial balance
  // ---------------------------------------------------------------------------

  @Get('trial-balance')
  @ApiOperation({ summary: 'Trial balance across all addresses' })
  @ApiQuery({ name: 'addressId', required: false })
  getTrialBalance(@CurrentUser() user: User, @Query('addressId') addressId?: string) {
    return this.service.getTrialBalance(user.id, addressId);
  }

  // ---------------------------------------------------------------------------
  // Journal entries
  // ---------------------------------------------------------------------------

  @Get('addresses/:id/journal')
  @ApiOperation({ summary: 'Journal entries for a tracked address' })
  @ApiParam({ name: 'id' })
  getJournalEntries(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.getJournalEntries(user.id, id);
  }
}
