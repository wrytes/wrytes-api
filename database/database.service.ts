import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DockerDatabaseService } from '../docker/docker.database.service';
import { DATABASE_CONFIG } from '../api.config';
import { ConnectionStatus, DatabaseHealth, PerformanceMetrics, DatabaseConnectionSource } from './types/database.types';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(this.constructor.name);
	private prisma: PrismaClient | null = null;
	private connectionStatus: ConnectionStatus;
	private dockerFallbackActive = false;
	private performanceMetrics: PerformanceMetrics;

	constructor(private readonly dockerDatabase: DockerDatabaseService) {
		this.connectionStatus = {
			connected: false,
			source: 'primary',
			connectionString: '',
		};

		this.performanceMetrics = {
			queryCount: 0,
			averageResponseTime: 0,
			slowestQuery: 0,
			connectionPoolSize: DATABASE_CONFIG.connection.poolSize,
			activeConnections: 0,
			idleConnections: 0,
			lastUpdated: new Date(),
		};
	}

	async onModuleInit() {
		// Don't block application startup if database connection fails
		this.connect().catch((error) => {
			this.logger.error('Database connection failed during startup:', error);
			this.connectionStatus.error = error.message;
		});
	}

	async onModuleDestroy() {
		await this.disconnect();
	}

	private async connect(): Promise<void> {
		this.logger.log('Attempting to connect to database...');

		// Try primary connection first
		if (await this.tryConnection('primary', DATABASE_CONFIG.primary)) {
			return;
		}

		// Try fallback connection if configured
		if (DATABASE_CONFIG.fallback && (await this.tryConnection('fallback', DATABASE_CONFIG.fallback))) {
			return;
		}

		// Try Docker fallback
		if (await this.tryDockerFallback()) {
			return;
		}

		// If all methods fail, log error but don't throw to allow app to start
		const errorMsg = 'Failed to establish database connection with all available methods';
		this.logger.error(errorMsg);
		this.connectionStatus.error = errorMsg;
		throw new Error(errorMsg);
	}

	private async tryConnection(source: DatabaseConnectionSource, connectionString: string | undefined): Promise<boolean> {
		if (!connectionString) {
			this.logger.warn(`No ${source} database URL configured`);
			return false;
		}

		this.logger.log(`Attempting ${source} database connection...`);

		for (let attempt = 1; attempt <= DATABASE_CONFIG.connection.retryAttempts; attempt++) {
			try {
				const testPrisma = new PrismaClient({
					datasources: {
						db: {
							url: connectionString,
						},
					},
				});

				// Test connection
				await testPrisma.$connect();
				await testPrisma.$queryRaw`SELECT 1`;

				// If successful, set as main client
				this.prisma = testPrisma;
				this.connectionStatus = {
					connected: true,
					source,
					connectionString: this.maskConnectionString(connectionString),
				};

				this.logger.log(`Successfully connected to ${source} database`);
				return true;
			} catch (error) {
				this.logger.warn(`${source} database connection attempt ${attempt} failed:`, error);

				if (attempt < DATABASE_CONFIG.connection.retryAttempts) {
					await new Promise((resolve) => setTimeout(resolve, DATABASE_CONFIG.connection.retryDelay));
				}
			}
		}

		return false;
	}

	private async tryDockerFallback(): Promise<boolean> {
		this.logger.log('Attempting Docker database fallback...');

		try {
			// Check if Docker is available
			if (!await this.isDockerAvailable()) {
				this.logger.warn('Docker is not available, skipping Docker fallback');
				return false;
			}

			// Deploy PostgreSQL container
			const deployed = await this.dockerDatabase.deployPostgresContainer();
			if (!deployed) {
				this.logger.error('Failed to deploy PostgreSQL container');
				return false;
			}

			// Get connection URL from Docker service
			const dockerUrl = this.dockerDatabase.getDatabaseUrl();

			// Try to connect to Docker database with more patience
			if (await this.tryDockerConnection('docker', dockerUrl)) {
				this.dockerFallbackActive = true;
				this.logger.log('Successfully connected to Docker database fallback');
				return true;
			}

			return false;
		} catch (error) {
			this.logger.error('Docker fallback failed:', error);
			return false;
		}
	}

	private async isDockerAvailable(): Promise<boolean> {
		try {
			await this.dockerDatabase['dockerClient'].waitForReady(5000); // 5 second timeout
			return true;
		} catch (error) {
			this.logger.warn('Docker client not ready:', error);
			return false;
		}
	}

	private async tryDockerConnection(source: DatabaseConnectionSource, connectionString: string): Promise<boolean> {
		this.logger.log(`Attempting ${source} database connection with extended retry for container initialization...`);

		for (let attempt = 1; attempt <= DATABASE_CONFIG.connection.dockerRetryAttempts; attempt++) {
			try {
				
				const testPrisma = new PrismaClient({
					datasources: {
						db: {
							url: connectionString,
						},
					},
					log: attempt <= 3 ? ['error'] : [],
				});

				// Test connection
				await testPrisma.$connect();
				await testPrisma.$queryRaw`SELECT 1`;

				// If successful, set as main client
				this.prisma = testPrisma;
				this.connectionStatus = {
					connected: true,
					source,
					connectionString: this.maskConnectionString(connectionString),
				};

				this.logger.log(`Successfully connected to ${source} database after ${attempt} attempts`);
				return true;
			} catch (error) {
				if (attempt <= 3 || attempt % 3 === 0) {
					this.logger.warn(`${source} database connection attempt ${attempt} failed:`, error.message);
				}

				if (attempt < DATABASE_CONFIG.connection.dockerRetryAttempts) {
					await new Promise((resolve) => setTimeout(resolve, DATABASE_CONFIG.connection.dockerRetryDelay));
				}
			}
		}

		this.logger.error(`Failed to connect to ${source} database after ${DATABASE_CONFIG.connection.dockerRetryAttempts} attempts`);
		return false;
	}

	async disconnect(): Promise<void> {
		if (this.prisma) {
			await this.prisma.$disconnect();
			this.prisma = null;
			this.connectionStatus.connected = false;
			this.logger.log('Disconnected from database');
		}
	}

	async healthCheck(): Promise<DatabaseHealth> {
		const startTime = Date.now();

		try {
			if (!this.prisma || !this.connectionStatus.connected) {
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

			// Test database connection
			await this.prisma.$queryRaw`SELECT 1`;
			const responseTime = Date.now() - startTime;

			// Get connection pool info (simplified)
			const connectionInfo = {
				primary: this.connectionStatus.source === 'primary',
				fallback: this.connectionStatus.source === 'fallback',
				docker: this.connectionStatus.source === 'docker',
			};

			const status = responseTime < 1000 ? 'healthy' : 'degraded';

			return {
				status,
				connection: connectionInfo,
				performance: {
					responseTime,
					activeConnections: this.performanceMetrics.activeConnections,
					poolUtilization: this.calculatePoolUtilization(),
				},
				lastChecked: new Date(),
			};
		} catch (error) {
			this.logger.error('Health check failed:', error);

			return {
				status: 'unhealthy',
				connection: {
					primary: false,
					fallback: null,
					docker: null,
				},
				performance: {
					responseTime: Date.now() - startTime,
					activeConnections: 0,
					poolUtilization: 0,
				},
				lastChecked: new Date(),
			};
		}
	}

	getConnectionStatus(): ConnectionStatus {
		return { ...this.connectionStatus };
	}

	getPerformanceMetrics(): PerformanceMetrics {
		return { ...this.performanceMetrics };
	}

	getPrismaClient(): PrismaClient | null {
		return this.prisma;
	}

	isDockerFallbackActive(): boolean {
		return this.dockerFallbackActive;
	}

	private maskConnectionString(connectionString: string): string {
		// Mask password in connection string for security
		return connectionString.replace(/:([^:@]+)@/, ':****@');
	}

	private calculatePoolUtilization(): number {
		if (this.performanceMetrics.connectionPoolSize === 0) return 0;
		return (this.performanceMetrics.activeConnections / this.performanceMetrics.connectionPoolSize) * 100;
	}

	// Method to update performance metrics (called by interceptors/middleware)
	updateMetrics(queryTime: number): void {
		this.performanceMetrics.queryCount++;
		this.performanceMetrics.averageResponseTime =
			(this.performanceMetrics.averageResponseTime * (this.performanceMetrics.queryCount - 1) + queryTime) /
			this.performanceMetrics.queryCount;
		this.performanceMetrics.slowestQuery = Math.max(this.performanceMetrics.slowestQuery, queryTime);
		this.performanceMetrics.lastUpdated = new Date();
	}

	// Method to manually retry connection
	async retryConnection(): Promise<boolean> {
		this.logger.log('Manually retrying database connection...');
		try {
			await this.connect();
			return true;
		} catch (error) {
			this.logger.error('Manual connection retry failed:', error);
			return false;
		}
	}
}
