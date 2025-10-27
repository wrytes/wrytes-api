import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { CacheType, CacheEntry } from './etherscan.types';
import { createHash } from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class EtherscanCacheService {
	private readonly logger = new Logger(EtherscanCacheService.name);
	private memoryCache = new Map<string, CacheEntry>();

	constructor(private readonly databaseService: DatabaseService) {}

	private get prisma(): PrismaClient {
		const client = this.databaseService.getPrismaClient();
		if (!client) {
			throw new Error('Database client not available');
		}
		return client;
	}

	private generateCacheKey(requestType: CacheType, params: Record<string, any>): string {
		const sortedParams = Object.keys(params)
			.sort()
			.reduce(
				(result, key) => {
					result[key] = params[key];
					return result;
				},
				{} as Record<string, any>
			);

		return createHash('sha256')
			.update(`${requestType}:${JSON.stringify(sortedParams)}`)
			.digest('hex');
	}

	private getTTL(requestType: CacheType): number {
		const ttlMap = {
			[CacheType.GAS_ORACLE]: 30 * 1000, // 30 seconds
			[CacheType.BALANCE]: 5 * 60 * 1000, // 5 minutes
			[CacheType.TOKEN_BALANCE]: 5 * 60 * 1000, // 5 minutes
			[CacheType.TRANSACTIONS]: 60 * 60 * 1000, // 1 hour
			[CacheType.TOKEN_TRANSFERS]: 60 * 60 * 1000, // 1 hour
			[CacheType.BLOCK_INFO]: 24 * 60 * 60 * 1000, // 24 hours
			[CacheType.ADDRESS_TAG]: 24 * 60 * 60 * 1000, // 24 hours
		};
		return ttlMap[requestType] || 5 * 60 * 1000; // Default 5 minutes
	}

	async get<T>(requestType: CacheType, params: Record<string, any>): Promise<T | null> {
		const cacheKey = this.generateCacheKey(requestType, params);

		// Check memory cache first
		const memoryEntry = this.memoryCache.get(cacheKey);
		if (memoryEntry && memoryEntry.expiresAt > new Date()) {
			this.logger.debug(`Cache hit in memory for ${requestType}`);
			return memoryEntry.response as T;
		}

		// Check database cache
		try {
			const dbEntry = await this.prisma.etherscanCache.findUnique({
				where: {
					requestType_parameters: {
						requestType,
						parameters: cacheKey,
					},
				},
			});

			if (dbEntry && dbEntry.expiresAt > new Date()) {
				this.logger.debug(`Cache hit in database for ${requestType}`);

				// Update memory cache
				this.memoryCache.set(cacheKey, {
					requestType,
					parameters: cacheKey,
					response: dbEntry.response,
					expiresAt: dbEntry.expiresAt,
				});

				return dbEntry.response as T;
			}
		} catch (error) {
			this.logger.error(`Error reading from cache: ${error.message}`);
		}

		return null;
	}

	async set<T>(requestType: CacheType, params: Record<string, any>, data: T): Promise<void> {
		const cacheKey = this.generateCacheKey(requestType, params);
		const ttl = this.getTTL(requestType);
		const expiresAt = new Date(Date.now() + ttl);

		const cacheEntry: CacheEntry = {
			requestType,
			parameters: cacheKey,
			response: data,
			expiresAt,
		};

		// Update memory cache
		this.memoryCache.set(cacheKey, cacheEntry);

		// Update database cache
		try {
			await this.prisma.etherscanCache.upsert({
				where: {
					requestType_parameters: {
						requestType,
						parameters: cacheKey,
					},
				},
				update: {
					response: data as any,
					expiresAt,
				},
				create: {
					requestType,
					parameters: cacheKey,
					response: data as any,
					expiresAt,
				},
			});

			this.logger.debug(`Cached ${requestType} data with TTL ${ttl}ms`);
		} catch (error) {
			this.logger.error(`Error writing to cache: ${error.message}`);
		}
	}

	async invalidate(requestType: CacheType, params?: Record<string, any>): Promise<void> {
		if (params) {
			const cacheKey = this.generateCacheKey(requestType, params);
			this.memoryCache.delete(cacheKey);

			try {
				await this.prisma.etherscanCache.delete({
					where: {
						requestType_parameters: {
							requestType,
							parameters: cacheKey,
						},
					},
				});
			} catch (error) {
				// Entry might not exist, which is fine
			}
		} else {
			// Invalidate all entries of this type
			for (const [key, entry] of this.memoryCache.entries()) {
				if (entry.requestType === requestType) {
					this.memoryCache.delete(key);
				}
			}

			try {
				await this.prisma.etherscanCache.deleteMany({
					where: { requestType },
				});
			} catch (error) {
				this.logger.error(`Error invalidating cache: ${error.message}`);
			}
		}

		this.logger.debug(`Invalidated cache for ${requestType}`);
	}

	// crear up outdated cache daily
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async cleanup(): Promise<void> {
		const now = new Date();

		// Clean memory cache
		for (const [key, entry] of this.memoryCache.entries()) {
			if (entry.expiresAt <= now) {
				this.memoryCache.delete(key);
			}
		}

		// Clean database cache
		try {
			const deleted = await this.prisma.etherscanCache.deleteMany({
				where: {
					expiresAt: {
						lte: now,
					},
				},
			});

			this.logger.debug(`Cleaned up ${deleted.count} expired cache entries`);
		} catch (error) {
			this.logger.error(`Error cleaning up cache: ${error.message}`);
		}
	}

	getCacheStats(): { memoryEntries: number; dbEntries?: number } {
		return {
			memoryEntries: this.memoryCache.size,
		};
	}
}
