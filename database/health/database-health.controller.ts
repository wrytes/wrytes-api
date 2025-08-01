import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseHealthService } from './database-health.service';
import { DatabaseHealth, PerformanceMetrics, MigrationStatus } from '../types/database.types';

@ApiTags('Database Health')
@Controller('health')
export class DatabaseHealthController {
	constructor(private readonly healthService: DatabaseHealthService) {}

	@Get('database')
	@ApiOperation({ summary: 'Get database health status' })
	@ApiResponse({
		status: 200,
		description: 'Database health information',
		schema: {
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
				connection: {
					type: 'object',
					properties: {
						primary: { type: 'boolean' },
						fallback: { type: 'boolean', nullable: true },
						docker: { type: 'boolean', nullable: true },
					},
				},
				performance: {
					type: 'object',
					properties: {
						responseTime: { type: 'number' },
						activeConnections: { type: 'number' },
						poolUtilization: { type: 'number' },
					},
				},
				lastChecked: { type: 'string', format: 'date-time' },
			},
		},
	})
	async getDatabaseHealth(): Promise<DatabaseHealth> {
		return this.healthService.getOverallHealth();
	}

	@Get('database/connections')
	@ApiOperation({ summary: 'Get active connections count' })
	@ApiResponse({
		status: 200,
		description: 'Active database connections',
		schema: {
			type: 'object',
			properties: {
				activeConnections: { type: 'number' },
				timestamp: { type: 'string', format: 'date-time' },
			},
		},
	})
	async getActiveConnections(): Promise<{ activeConnections: number; timestamp: Date }> {
		const activeConnections = await this.healthService.getActiveConnections();
		return {
			activeConnections,
			timestamp: new Date(),
		};
	}

	@Get('database/migrations')
	@ApiOperation({ summary: 'Get migration status' })
	@ApiResponse({
		status: 200,
		description: 'Database migration status',
		schema: {
			type: 'object',
			properties: {
				applied: { type: 'array', items: { type: 'string' } },
				pending: { type: 'array', items: { type: 'string' } },
				failed: { type: 'array', items: { type: 'string' } },
				lastMigration: { type: 'string', nullable: true },
				schemaVersion: { type: 'string' },
			},
		},
	})
	async getMigrationStatus(): Promise<MigrationStatus> {
		return this.healthService.getMigrationStatus();
	}

	@Get('database/performance')
	@ApiOperation({ summary: 'Get performance metrics' })
	@ApiResponse({
		status: 200,
		description: 'Database performance metrics',
		schema: {
			type: 'object',
			properties: {
				queryCount: { type: 'number' },
				averageResponseTime: { type: 'number' },
				slowestQuery: { type: 'number' },
				connectionPoolSize: { type: 'number' },
				activeConnections: { type: 'number' },
				idleConnections: { type: 'number' },
				lastUpdated: { type: 'string', format: 'date-time' },
			},
		},
	})
	async getPerformanceMetrics(): Promise<PerformanceMetrics> {
		return this.healthService.getPerformanceMetrics();
	}

	@Get('database/docker')
	@ApiOperation({ summary: 'Get Docker container status (if using Docker fallback)' })
	@ApiResponse({
		status: 200,
		description: 'Docker container health status',
		schema: {
			type: 'object',
			properties: {
				containerHealth: {
					type: 'object',
					nullable: true,
					properties: {
						status: { type: 'string', enum: ['starting', 'healthy', 'unhealthy'] },
						uptime: { type: 'number' },
						lastCheck: { type: 'string', format: 'date-time' },
					},
				},
				isDockerFallback: { type: 'boolean' },
			},
		},
	})
	async getDockerStatus(): Promise<{
		containerHealth: any;
		isDockerFallback: boolean;
	}> {
		const containerHealth = await this.healthService.getDockerContainerStatus();
		return {
			containerHealth,
			isDockerFallback: containerHealth !== null,
		};
	}

	@Get('database/test')
	@ApiOperation({ summary: 'Test database connection' })
	@ApiResponse({
		status: 200,
		description: 'Database connection test result',
		schema: {
			type: 'object',
			properties: {
				connected: { type: 'boolean' },
				timestamp: { type: 'string', format: 'date-time' },
			},
		},
	})
	async testConnection(): Promise<{ connected: boolean; timestamp: Date }> {
		const connected = await this.healthService.testDatabaseConnection();
		return {
			connected,
			timestamp: new Date(),
		};
	}
}
