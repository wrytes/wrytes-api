import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheType } from './etherscan.types';

interface MemoryCacheEntry {
  response: any;
  expiresAt: Date;
}

const TTL: Record<CacheType, number> = {
  [CacheType.GAS_ORACLE]:       30 * 1000,          // 30 seconds
  [CacheType.BALANCE]:           5 * 60 * 1000,      // 5 minutes
  [CacheType.TOKEN_BALANCE]:     5 * 60 * 1000,      // 5 minutes
  [CacheType.TRANSACTIONS]:     60 * 60 * 1000,      // 1 hour
  [CacheType.TOKEN_TRANSFERS]:  60 * 60 * 1000,      // 1 hour
  [CacheType.BLOCK_INFO]:   24 * 60 * 60 * 1000,     // 24 hours
  [CacheType.ADDRESS_TAG]:  24 * 60 * 60 * 1000,     // 24 hours
};

@Injectable()
export class EtherscanCacheService {
  private readonly logger = new Logger(EtherscanCacheService.name);
  private readonly memory = new Map<string, MemoryCacheEntry>();

  constructor(private readonly prisma: PrismaService) {}

  private key(requestType: CacheType, params: Record<string, any>): string {
    const sorted = Object.fromEntries(Object.keys(params).sort().map((k) => [k, params[k]]));
    return createHash('sha256').update(`${requestType}:${JSON.stringify(sorted)}`).digest('hex');
  }

  async get<T>(requestType: CacheType, params: Record<string, any>): Promise<T | null> {
    const k = this.key(requestType, params);
    const now = new Date();

    const mem = this.memory.get(k);
    if (mem && mem.expiresAt > now) return mem.response as T;

    try {
      const row = await this.prisma.etherscanCache.findUnique({
        where: { requestType_parameters: { requestType, parameters: k } },
      });
      if (row && row.expiresAt > now) {
        this.memory.set(k, { response: row.response, expiresAt: row.expiresAt });
        return row.response as T;
      }
    } catch (err) {
      this.logger.error(`Cache read error: ${err.message}`);
    }

    return null;
  }

  async set<T>(requestType: CacheType, params: Record<string, any>, data: T): Promise<void> {
    const k = this.key(requestType, params);
    const expiresAt = new Date(Date.now() + (TTL[requestType] ?? 5 * 60 * 1000));

    this.memory.set(k, { response: data, expiresAt });

    try {
      await this.prisma.etherscanCache.upsert({
        where: { requestType_parameters: { requestType, parameters: k } },
        update: { response: data as any, expiresAt },
        create: { requestType, parameters: k, response: data as any, expiresAt },
      });
    } catch (err) {
      this.logger.error(`Cache write error: ${err.message}`);
    }
  }

  async invalidate(requestType: CacheType, params?: Record<string, any>): Promise<void> {
    if (params) {
      const k = this.key(requestType, params);
      this.memory.delete(k);
      await this.prisma.etherscanCache
        .delete({ where: { requestType_parameters: { requestType, parameters: k } } })
        .catch(() => {});
    } else {
      for (const [k, e] of this.memory) {
        if ((e as any).requestType === requestType) this.memory.delete(k);
      }
      await this.prisma.etherscanCache.deleteMany({ where: { requestType } }).catch(() => {});
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanup(): Promise<void> {
    const now = new Date();
    for (const [k, e] of this.memory) {
      if (e.expiresAt <= now) this.memory.delete(k);
    }
    const { count } = await this.prisma.etherscanCache.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    this.logger.debug(`Cleaned ${count} expired cache entries`);
  }

  getStats(): { memoryEntries: number } {
    return { memoryEntries: this.memory.size };
  }
}
