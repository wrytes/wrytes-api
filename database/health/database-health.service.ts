import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { DockerDatabaseService } from '../../docker/docker.database.service';
import { DatabaseHealth, ConnectionStatus, PerformanceMetrics, MigrationStatus } from '../types/database.types';

@Injectable()
export class DatabaseHealthService {
	private readonly logger = new Logger(this.constructor.name);

	constructor(
		private readonly databaseService: DatabaseService,
		private readonly dockerDatabaseService: DockerDatabaseService
	) {}

	async getOverallHealth(): Promise<DatabaseHealth> {
		try {
			return await this.databaseService.healthCheck();
		} catch (error) {
			this.logger.error('Failed to get overall health:', error);
			return {
				status: 'unhealthy',
				connection: {
					primary: false,
					fallback: null,
					docker: null,
				},
				performance: {
					responseTime: -1,
					activeConnections: 0,
					poolUtilization: 0,
				},
				lastChecked: new Date(),
			};
		}
	}

	async getConnectionStatus(): Promise<ConnectionStatus> {
		try {
			return this.databaseService.getConnectionStatus();
		} catch (error) {
			this.logger.error('Failed to get connection status:', error);
			return {
				connected: false,
				source: 'primary',
				connectionString: '',
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	}

	async getPerformanceMetrics(): Promise<PerformanceMetrics> {
		try {
			return this.databaseService.getPerformanceMetrics();
		} catch (error) {
			this.logger.error('Failed to get performance metrics:', error);
			return {
				queryCount: 0,
				averageResponseTime: 0,
				slowestQuery: 0,
				connectionPoolSize: 0,
				activeConnections: 0,
				idleConnections: 0,
				lastUpdated: new Date(),
			};
		}
	}

	async getMigrationStatus(): Promise<MigrationStatus> {
		try {
			const prisma = this.databaseService.getPrismaClient();
			if (!prisma) {
				return {
					applied: [],
					pending: [],
					failed: [],
					lastMigration: null,
					schemaVersion: 'unknown',
				};
			}

			// Query migration history from Prisma's _prisma_migrations table
			try {
				const migrations = await prisma.$queryRaw<
					Array<{
						id: string;
						checksum: string;
						finished_at: Date | null;
						migration_name: string;
						logs: string | null;
						rolled_back_at: Date | null;
						started_at: Date;
						applied_steps_count: number;
					}>
				>`
					SELECT id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
					FROM _prisma_migrations
					ORDER BY started_at DESC
				`;

				const applied = migrations.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name);

				const failed = migrations.filter((m) => !m.finished_at && m.logs).map((m) => m.migration_name);

				const lastMigration = applied.length > 0 ? applied[0] : null;

				return {
					applied,
					pending: [], // Prisma doesn't track pending migrations in the same way
					failed,
					lastMigration,
					schemaVersion: lastMigration || 'none',
				};
			} catch (migrationError) {
				// If _prisma_migrations table doesn't exist, assume no migrations applied
				this.logger.warn('Migration table not found, assuming fresh database');
				return {
					applied: [],
					pending: [],
					failed: [],
					lastMigration: null,
					schemaVersion: 'none',
				};
			}
		} catch (error) {
			this.logger.error('Failed to get migration status:', error);
			return {
				applied: [],
				pending: [],
				failed: [],
				lastMigration: null,
				schemaVersion: 'error',
			};
		}
	}

	async getActiveConnections(): Promise<number> {
		try {
			const prisma = this.databaseService.getPrismaClient();
			if (!prisma) return 0;

			// Query PostgreSQL for active connections
			const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
				SELECT COUNT(*) as count
				FROM pg_stat_activity
				WHERE state = 'active'
			`;

			return Number(result[0]?.count || 0);
		} catch (error) {
			this.logger.error('Failed to get active connections:', error);
			return 0;
		}
	}

	async getDockerContainerStatus() {
		try {
			if (!this.databaseService.isDockerFallbackActive()) {
				return null;
			}

			return await this.dockerDatabaseService.getContainerHealth();
		} catch (error) {
			this.logger.error('Failed to get Docker container status:', error);
			return null;
		}
	}

	async testDatabaseConnection(): Promise<boolean> {
		try {
			const prisma = this.databaseService.getPrismaClient();
			if (!prisma) return false;

			await prisma.$queryRaw`SELECT 1`;
			return true;
		} catch (error) {
			this.logger.error('Database connection test failed:', error);
			return false;
		}
	}
}
