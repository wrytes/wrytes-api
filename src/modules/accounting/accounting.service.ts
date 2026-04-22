import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import {
  TransferClassification,
  AccountType,
  NormalBalance,
  JournalLineType,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AlchemyService } from '../../integrations/alchemy/alchemy.service';

const CHAIN_ID_MAP: Record<string, number> = {
  'eth-mainnet':     1,
  'polygon-mainnet': 137,
  'opt-mainnet':     10,
  'arb-mainnet':     42161,
  'base-mainnet':    8453,
};

const MAX_PER_PAGE = 1000;

// Extracts the numeric log/event index from Alchemy uniqueId.
// Format: "<txHash>:log:<n>" where <n> may be decimal ("145") or hex ("0x91").
// parseInt without a radix auto-detects the 0x prefix — do NOT pass radix 10.
function parseLogIndex(uniqueId: string): number {
  const last = uniqueId.split(':').at(-1);
  const n = parseInt(last ?? '');
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Default chart of accounts
// ---------------------------------------------------------------------------

const DEFAULT_ACCOUNTS = [
  { name: 'Crypto Assets',      code: '1000', type: AccountType.ASSET,     normalBalance: NormalBalance.DEBIT  },
  { name: 'Internal Transfers', code: '1900', type: AccountType.ASSET,     normalBalance: NormalBalance.DEBIT  },
  { name: 'Loans Payable',      code: '2000', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
  { name: 'Equity',             code: '3000', type: AccountType.EQUITY,    normalBalance: NormalBalance.CREDIT },
  { name: 'Income',             code: '4000', type: AccountType.REVENUE,   normalBalance: NormalBalance.CREDIT },
  { name: 'Swap Proceeds',      code: '4100', type: AccountType.REVENUE,   normalBalance: NormalBalance.CREDIT },
  { name: 'Expenses',           code: '6000', type: AccountType.EXPENSE,   normalBalance: NormalBalance.DEBIT  },
  { name: 'Swap Cost',          code: '6100', type: AccountType.EXPENSE,   normalBalance: NormalBalance.DEBIT  },
];

// Default debit/credit account names per classification + direction.
// Direction "ANY" matches both IN and OUT when no direction-specific template exists.
const DEFAULT_TEMPLATES: Record<string, { debit: string; credit: string }> = {
  [`${TransferClassification.ASSET}:ANY`]:     { debit: 'Crypto Assets', credit: 'Income'          },
  [`${TransferClassification.RECEIVED}:ANY`]:  { debit: 'Crypto Assets', credit: 'Income'          },
  [`${TransferClassification.SWAP_IN}:ANY`]:   { debit: 'Crypto Assets', credit: 'Swap Proceeds'   },
  [`${TransferClassification.LIABILITY}:ANY`]: { debit: 'Crypto Assets', credit: 'Loans Payable'   },
  [`${TransferClassification.PAYMENT}:ANY`]:   { debit: 'Expenses',      credit: 'Crypto Assets'   },
  [`${TransferClassification.SWAP_OUT}:ANY`]:  { debit: 'Swap Cost',     credit: 'Crypto Assets'   },
  [`${TransferClassification.TRANSFER}:IN`]:   { debit: 'Crypto Assets', credit: 'Internal Transfers' },
  [`${TransferClassification.TRANSFER}:OUT`]:  { debit: 'Internal Transfers', credit: 'Crypto Assets'  },
};

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alchemy: AlchemyService,
  ) {}

  // ---------------------------------------------------------------------------
  // Addresses
  // ---------------------------------------------------------------------------

  async addAddress(userId: string, address: string, chain: string, label?: string) {
    const chainId = CHAIN_ID_MAP[chain];
    if (!chainId) throw new ConflictException(`Unsupported chain: ${chain}`);
    const normalised = address.toLowerCase();
    return this.prisma.accountingAddress.upsert({
      where: { userId_address_chainId: { userId, address: normalised, chainId } },
      create: { userId, address: normalised, chain, chainId, label },
      update: { label, chain },
    });
  }

  async listAddresses(userId: string) {
    return this.prisma.accountingAddress.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeAddress(userId: string, id: string) {
    const row = await this.prisma.accountingAddress.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Address not found');
    await this.prisma.accountingAddress.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  async syncAddress(userId: string, id: string): Promise<{ synced: number }> {
    const acct = await this.prisma.accountingAddress.findFirst({ where: { id, userId } });
    if (!acct) throw new NotFoundException('Address not found');

    const blacklist = await this.prisma.accountingBlacklist.findMany({
      where: { chainId: acct.chainId },
      select: { tokenAddress: true },
    });
    const blacklisted = new Set(blacklist.map(b => b.tokenAddress.toLowerCase()));

    const all = await this.fetchAllTransfers(acct.chain, acct.address);
    const seen = new Set<string>();
    const unique = all.filter(t => {
      if (seen.has(t.uniqueId)) return false;
      seen.add(t.uniqueId);
      return true;
    });

    const addr = acct.address.toLowerCase();
    const rows = unique.map(t => {
      const tokenAddr = t.rawContract.address?.toLowerCase() ?? null;
      const decimalsHex = t.rawContract.decimal;
      const tokenDecimals = decimalsHex
        ? (decimalsHex.startsWith('0x') ? parseInt(decimalsHex, 16) : parseInt(decimalsHex, 10))
        : null;
      const blockNumber = t.blockNum ? parseInt(t.blockNum, 16) : null;
      const logIndex = parseLogIndex(t.uniqueId);

      return {
        accountingAddressId: acct.id,
        chainId: acct.chainId,
        txHash: t.hash,
        alchemyUniqueId: t.uniqueId,
        blockNum: t.blockNum,
        blockNumber,
        logIndex,
        timestamp: t.metadata?.blockTimestamp ? new Date(t.metadata.blockTimestamp) : null,
        direction: t.to?.toLowerCase() === addr ? 'IN' : 'OUT',
        tokenAddress: tokenAddr,
        tokenSymbol: t.asset ?? null,
        tokenDecimals,
        tokenType: t.category,
        amountRaw: t.rawContract.value ?? null,
        amountFormatted: t.value !== null && t.value !== undefined ? String(t.value) : null,
        fromAddress: t.from.toLowerCase(),
        toAddress: t.to?.toLowerCase() ?? null,
        isHidden: tokenAddr ? blacklisted.has(tokenAddr) : false,
      };
    });

    const result = await this.prisma.accountingTransfer.createMany({
      data: rows,
      skipDuplicates: true,
    });

    // Backfill blockNumber/logIndex for records synced before these fields existed
    const metaMap = new Map(rows.map(r => [r.alchemyUniqueId, { blockNumber: r.blockNumber, logIndex: r.logIndex }]));
    const needsBackfill = await this.prisma.accountingTransfer.findMany({
      where: { accountingAddressId: acct.id, logIndex: null },
      select: { id: true, alchemyUniqueId: true },
    });
    if (needsBackfill.length > 0) {
      const updates = needsBackfill
        .filter(r => metaMap.has(r.alchemyUniqueId))
        .map(r => {
          const meta = metaMap.get(r.alchemyUniqueId)!;
          return this.prisma.accountingTransfer.update({
            where: { id: r.id },
            data: { blockNumber: meta.blockNumber, logIndex: meta.logIndex },
          });
        });
      await this.prisma.$transaction(updates);
      this.logger.log(`Backfilled block/log indices for ${updates.length} transfers`);
    }

    await this.prisma.accountingAddress.update({
      where: { id: acct.id },
      data: { lastSyncedAt: new Date() },
    });

    this.logger.log(`Synced ${result.count} new transfers for ${acct.address}`);
    return { synced: result.count };
  }

  private async fetchAllTransfers(chain: string, address: string) {
    const transfers = [];
    for (const dir of ['from', 'to'] as const) {
      let pageKey: string | undefined;
      do {
        const res = await this.alchemy.getTokenTransfers(chain, address, dir, MAX_PER_PAGE, pageKey);
        transfers.push(...res.transfers);
        pageKey = res.pageKey;
      } while (pageKey);
    }
    return transfers;
  }

  // ---------------------------------------------------------------------------
  // Transfers
  // ---------------------------------------------------------------------------

  async getTransfers(
    userId: string,
    addressId: string,
    opts: {
      search?: string;
      classification?: string;
      direction?: string;
      showHidden?: boolean;
      skip?: number;
      take?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    },
  ) {
    const acct = await this.prisma.accountingAddress.findFirst({ where: { id: addressId, userId } });
    if (!acct) throw new NotFoundException('Address not found');

    const where: any = { accountingAddressId: addressId };
    if (!opts.showHidden) where.isHidden = false;
    if (opts.direction) where.direction = opts.direction;
    if (opts.classification) where.classification = opts.classification as TransferClassification;

    if (opts.search) {
      const q = opts.search.toLowerCase();
      where.OR = [
        { tokenSymbol: { contains: q, mode: 'insensitive' } },
        { txHash: { contains: q, mode: 'insensitive' } },
        { fromAddress: { contains: q, mode: 'insensitive' } },
        { toAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const sortField = opts.sortBy ?? 'timestamp';
    const sortDir = opts.sortDir ?? 'desc';
    const orderBy: any =
      sortField === 'timestamp'
        ? [{ timestamp: sortDir }, { blockNumber: sortDir }, { logIndex: sortDir }]
        : { [sortField]: sortDir };

    const [total, transfers] = await Promise.all([
      this.prisma.accountingTransfer.count({ where }),
      this.prisma.accountingTransfer.findMany({ where, orderBy, skip: opts.skip ?? 0, take: opts.take ?? 50 }),
    ]);

    return { total, transfers };
  }

  async updateTransfer(
    userId: string,
    transferId: string,
    data: { classification?: TransferClassification; isHidden?: boolean; chfValue?: string | null; notes?: string | null },
  ) {
    const transfer = await this.prisma.accountingTransfer.findUnique({
      where: { id: transferId },
      include: { accountingAddress: { select: { userId: true } } },
    });
    if (!transfer || transfer.accountingAddress.userId !== userId) {
      throw new NotFoundException('Transfer not found');
    }

    const updated = await this.prisma.accountingTransfer.update({ where: { id: transferId }, data });

    // Keep journal entry in sync whenever classification or chfValue changes
    const newClassification = data.classification ?? transfer.classification;
    if (data.classification !== undefined || data.chfValue !== undefined) {
      if (
        newClassification === TransferClassification.UNCLASSIFIED ||
        newClassification === TransferClassification.SKIPPED
      ) {
        await this.prisma.journalEntry.deleteMany({ where: { transferId } });
      } else {
        await this.upsertJournalEntry(userId, updated);
      }
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Journal entries (private helpers)
  // ---------------------------------------------------------------------------

  private async upsertJournalEntry(userId: string, transfer: any): Promise<void> {
    const accounts = await this.getAccountMap(userId);
    const { debitId, creditId } = await this.resolveTemplate(userId, transfer, accounts);

    if (!debitId || !creditId) {
      this.logger.warn(`No accounts found for journal entry on transfer ${transfer.id}`);
      return;
    }

    const amount = transfer.amountFormatted ?? '0';
    const chf = transfer.chfValue ?? null;

    await this.prisma.journalEntry.upsert({
      where: { transferId: transfer.id },
      create: {
        transferId: transfer.id,
        date: transfer.timestamp ?? transfer.createdAt,
        description: `${transfer.tokenSymbol ?? '?'} ${transfer.direction} — ${transfer.txHash.slice(0, 10)}`,
        lines: {
          create: [
            { accountId: debitId,  type: JournalLineType.DEBIT,  amount, chfAmount: chf, tokenSymbol: transfer.tokenSymbol },
            { accountId: creditId, type: JournalLineType.CREDIT, amount, chfAmount: chf, tokenSymbol: transfer.tokenSymbol },
          ],
        },
      },
      update: {
        date: transfer.timestamp ?? transfer.createdAt,
        description: `${transfer.tokenSymbol ?? '?'} ${transfer.direction} — ${transfer.txHash.slice(0, 10)}`,
        lines: {
          deleteMany: {},
          create: [
            { accountId: debitId,  type: JournalLineType.DEBIT,  amount, chfAmount: chf, tokenSymbol: transfer.tokenSymbol },
            { accountId: creditId, type: JournalLineType.CREDIT, amount, chfAmount: chf, tokenSymbol: transfer.tokenSymbol },
          ],
        },
      },
    });
  }

  private async resolveTemplate(
    userId: string,
    transfer: { classification: TransferClassification; direction: string },
    accountMap: Map<string, string>,
  ): Promise<{ debitId: string | undefined; creditId: string | undefined }> {
    // Prefer direction-specific user override, fall back to ANY, then hardcoded defaults
    const [specificRow, anyRow] = await Promise.all([
      this.prisma.classificationTemplate.findFirst({
        where: { userId, classification: transfer.classification, direction: transfer.direction },
      }),
      this.prisma.classificationTemplate.findFirst({
        where: { userId, classification: transfer.classification, direction: 'ANY' },
      }),
    ]);
    const dbRow = specificRow ?? anyRow;

    if (dbRow) {
      return { debitId: dbRow.debitAccountId, creditId: dbRow.creditAccountId };
    }

    const dirKey = `${transfer.classification}:${transfer.direction}`;
    const anyKey = `${transfer.classification}:ANY`;
    const tmpl = DEFAULT_TEMPLATES[dirKey] ?? DEFAULT_TEMPLATES[anyKey];

    if (!tmpl) return { debitId: undefined, creditId: undefined };
    return {
      debitId:  accountMap.get(tmpl.debit),
      creditId: accountMap.get(tmpl.credit),
    };
  }

  // ---------------------------------------------------------------------------
  // Chart of accounts
  // ---------------------------------------------------------------------------

  async getAccounts(userId: string) {
    await this.ensureDefaultAccounts(userId);
    return this.prisma.accountingAccount.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { code: 'asc' }, { name: 'asc' }],
    });
  }

  async createAccount(
    userId: string,
    data: { name: string; code?: string; type: AccountType; normalBalance: NormalBalance; description?: string },
  ) {
    return this.prisma.accountingAccount.create({ data: { userId, ...data } });
  }

  async updateAccount(
    userId: string,
    id: string,
    data: { name?: string; code?: string; description?: string },
  ) {
    const row = await this.prisma.accountingAccount.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Account not found');
    return this.prisma.accountingAccount.update({ where: { id }, data });
  }

  async deleteAccount(userId: string, id: string) {
    const row = await this.prisma.accountingAccount.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Account not found');
    const usedBy = await this.prisma.journalLine.count({ where: { accountId: id } });
    if (usedBy > 0) throw new ConflictException('Account has journal entries and cannot be deleted');
    await this.prisma.accountingAccount.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Classification templates
  // ---------------------------------------------------------------------------

  async getTemplates(userId: string) {
    await this.ensureDefaultAccounts(userId);
    const userTemplates = await this.prisma.classificationTemplate.findMany({
      where: { userId },
      include: { debitAccount: true, creditAccount: true },
      orderBy: [{ classification: 'asc' }, { direction: 'asc' }],
    });

    // Merge with hardcoded defaults so the UI always shows all rows
    const accountMap = await this.getAccountMap(userId);
    const reverseMap = new Map(Array.from(accountMap.entries()).map(([name, id]) => [id, name]));

    const result = Object.entries(DEFAULT_TEMPLATES).map(([key, defaults]) => {
      const [classification, direction] = key.split(':') as [TransferClassification, string];
      const override = userTemplates.find(
        t => t.classification === classification && t.direction === direction,
      );
      return {
        classification,
        direction,
        debitAccountId:   override?.debitAccountId  ?? accountMap.get(defaults.debit),
        creditAccountId:  override?.creditAccountId ?? accountMap.get(defaults.credit),
        debitAccountName: override ? reverseMap.get(override.debitAccountId)  : defaults.debit,
        creditAccountName: override ? reverseMap.get(override.creditAccountId) : defaults.credit,
        isOverridden: !!override,
        id: override?.id,
      };
    });

    return result;
  }

  async upsertTemplate(
    userId: string,
    data: {
      classification: TransferClassification;
      direction: string;
      debitAccountId: string;
      creditAccountId: string;
    },
  ) {
    // Verify both accounts belong to this user
    const [debit, credit] = await Promise.all([
      this.prisma.accountingAccount.findFirst({ where: { id: data.debitAccountId, userId } }),
      this.prisma.accountingAccount.findFirst({ where: { id: data.creditAccountId, userId } }),
    ]);
    if (!debit || !credit) throw new NotFoundException('Account not found');

    return this.prisma.classificationTemplate.upsert({
      where: { userId_classification_direction: { userId, classification: data.classification, direction: data.direction } },
      create: { userId, ...data },
      update: { debitAccountId: data.debitAccountId, creditAccountId: data.creditAccountId },
    });
  }

  async deleteTemplate(userId: string, id: string) {
    const row = await this.prisma.classificationTemplate.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Template not found');
    await this.prisma.classificationTemplate.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Trial balance
  // ---------------------------------------------------------------------------

  async getTrialBalance(userId: string, addressId?: string) {
    await this.ensureDefaultAccounts(userId);

    const accounts = await this.prisma.accountingAccount.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { code: 'asc' }, { name: 'asc' }],
    });

    const lines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          transfer: {
            accountingAddress: {
              userId,
              ...(addressId ? { id: addressId } : {}),
            },
          },
        },
      },
      select: { accountId: true, type: true, amount: true, chfAmount: true },
    });

    const totals = new Map<string, { debit: number; credit: number; chfDebit: number; chfCredit: number }>();

    for (const line of lines) {
      if (!totals.has(line.accountId)) {
        totals.set(line.accountId, { debit: 0, credit: 0, chfDebit: 0, chfCredit: 0 });
      }
      const t = totals.get(line.accountId)!;
      const amt = parseFloat(line.amount) || 0;
      const chf = parseFloat(line.chfAmount ?? '0') || 0;
      if (line.type === JournalLineType.DEBIT)  { t.debit  += amt; t.chfDebit  += chf; }
      else                                       { t.credit += amt; t.chfCredit += chf; }
    }

    return accounts.map(acc => {
      const t = totals.get(acc.id) ?? { debit: 0, credit: 0, chfDebit: 0, chfCredit: 0 };
      const net    = acc.normalBalance === NormalBalance.DEBIT ? t.debit - t.credit   : t.credit - t.debit;
      const chfNet = acc.normalBalance === NormalBalance.DEBIT ? t.chfDebit - t.chfCredit : t.chfCredit - t.chfDebit;
      return { ...acc, ...t, net, chfNet };
    });
  }

  // ---------------------------------------------------------------------------
  // Journal entries (for display)
  // ---------------------------------------------------------------------------

  async getJournalEntries(userId: string, addressId: string) {
    const acct = await this.prisma.accountingAddress.findFirst({ where: { id: addressId, userId } });
    if (!acct) throw new NotFoundException('Address not found');

    return this.prisma.journalEntry.findMany({
      where: { transfer: { accountingAddressId: addressId } },
      include: {
        lines: { include: { account: true } },
        transfer: { select: { tokenSymbol: true, direction: true, txHash: true, classification: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  // Token balances — per-token IN/OUT/balance aggregation
  // ---------------------------------------------------------------------------

  async getTokenBalances(userId: string, addressId: string) {
    const acct = await this.prisma.accountingAddress.findFirst({ where: { id: addressId, userId } });
    if (!acct) throw new NotFoundException('Address not found');

    const transfers = await this.prisma.accountingTransfer.findMany({
      where: { accountingAddressId: addressId, isHidden: false },
      select: {
        tokenSymbol: true,
        tokenAddress: true,
        tokenType: true,
        direction: true,
        amountFormatted: true,
        classification: true,
        chfValue: true,
      },
    });

    type TokenKey = string;
    const map = new Map<TokenKey, {
      tokenSymbol: string | null;
      tokenAddress: string | null;
      tokenType: string;
      totalIn: number;
      totalOut: number;
      chfTotal: number;
      byClassification: Record<string, number>;
      inCount: number;
      outCount: number;
    }>();

    for (const t of transfers) {
      const key: TokenKey = `${t.tokenAddress ?? '__native__'}:${t.tokenSymbol ?? ''}`;
      if (!map.has(key)) {
        map.set(key, {
          tokenSymbol: t.tokenSymbol,
          tokenAddress: t.tokenAddress,
          tokenType: t.tokenType,
          totalIn: 0,
          totalOut: 0,
          chfTotal: 0,
          byClassification: {},
          inCount: 0,
          outCount: 0,
        });
      }
      const entry = map.get(key)!;
      const amount = parseFloat(t.amountFormatted ?? '0') || 0;
      const chf = parseFloat(t.chfValue ?? '0') || 0;

      if (t.direction === 'IN') {
        entry.totalIn += amount;
        entry.inCount += 1;
      } else {
        entry.totalOut += amount;
        entry.outCount += 1;
      }
      entry.chfTotal += chf;
      entry.byClassification[t.classification] = (entry.byClassification[t.classification] ?? 0) + amount;
    }

    return {
      address: acct,
      tokens: Array.from(map.values())
        .map(t => ({ ...t, balance: t.totalIn - t.totalOut }))
        .sort((a, b) => Math.abs(b.totalIn + b.totalOut) - Math.abs(a.totalIn + a.totalOut)),
    };
  }

  // ---------------------------------------------------------------------------
  // Legacy summary (kept for backwards compat)
  // ---------------------------------------------------------------------------

  async getSummary(userId: string, addressId: string) {
    const acct = await this.prisma.accountingAddress.findFirst({ where: { id: addressId, userId } });
    if (!acct) throw new NotFoundException('Address not found');
    const tb = await this.getTrialBalance(userId, addressId);
    return { address: acct, trialBalance: tb };
  }

  // ---------------------------------------------------------------------------
  // Blacklist
  // ---------------------------------------------------------------------------

  async getBlacklist() {
    return this.prisma.accountingBlacklist.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async addToBlacklist(userId: string, tokenAddress: string, chainId: number, tokenSymbol?: string, reason?: string) {
    const normalised = tokenAddress.toLowerCase();
    const entry = await this.prisma.accountingBlacklist.upsert({
      where: { tokenAddress_chainId: { tokenAddress: normalised, chainId } },
      create: { tokenAddress: normalised, chainId, tokenSymbol, reason, addedByUserId: userId },
      update: { tokenSymbol, reason },
    });
    await this.prisma.accountingTransfer.updateMany({
      where: { tokenAddress: normalised, chainId },
      data: { isHidden: true },
    });
    return entry;
  }

  async removeFromBlacklist(id: string) {
    const row = await this.prisma.accountingBlacklist.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Blacklist entry not found');
    await this.prisma.accountingBlacklist.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getAccountMap(userId: string): Promise<Map<string, string>> {
    const accounts = await this.prisma.accountingAccount.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    return new Map(accounts.map(a => [a.name, a.id]));
  }

  private async ensureDefaultAccounts(userId: string): Promise<void> {
    const count = await this.prisma.accountingAccount.count({ where: { userId } });
    if (count > 0) return;

    await this.prisma.accountingAccount.createMany({
      data: DEFAULT_ACCOUNTS.map(a => ({ ...a, userId })),
      skipDuplicates: true,
    });
  }
}
