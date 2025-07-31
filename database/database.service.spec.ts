import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from './database.service';
import { DockerDatabaseService } from '../docker/docker.database.service';

describe('DatabaseService', () => {
	let service: DatabaseService;

	// Mock DockerDatabaseService
	const mockDockerDatabaseService = {
		deployPostgresContainer: jest.fn(),
		isContainerHealthy: jest.fn(),
		getDatabaseUrl: jest.fn(),
		getContainerHealth: jest.fn(),
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				DatabaseService,
				{
					provide: DockerDatabaseService,
					useValue: mockDockerDatabaseService,
				},
			],
		}).compile();

		service = module.get<DatabaseService>(DatabaseService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});

	describe('getConnectionStatus', () => {
		it('should return connection status', () => {
			const status = service.getConnectionStatus();
			expect(status).toHaveProperty('connected');
			expect(status).toHaveProperty('source');
			expect(status).toHaveProperty('connectionString');
		});
	});

	describe('getPerformanceMetrics', () => {
		it('should return performance metrics', () => {
			const metrics = service.getPerformanceMetrics();
			expect(metrics).toHaveProperty('queryCount');
			expect(metrics).toHaveProperty('averageResponseTime');
			expect(metrics).toHaveProperty('connectionPoolSize');
		});
	});

	describe('isDockerFallbackActive', () => {
		it('should return docker fallback status', () => {
			const isDockerActive = service.isDockerFallbackActive();
			expect(typeof isDockerActive).toBe('boolean');
		});
	});

	describe('updateMetrics', () => {
		it('should update performance metrics correctly', () => {
			const initialMetrics = service.getPerformanceMetrics();
			const queryTime = 150;

			service.updateMetrics(queryTime);

			const updatedMetrics = service.getPerformanceMetrics();
			expect(updatedMetrics.queryCount).toBe(initialMetrics.queryCount + 1);
			expect(updatedMetrics.slowestQuery).toBeGreaterThanOrEqual(queryTime);
		});
	});

	describe('healthCheck', () => {
		it('should return unhealthy status when prisma client is not connected', async () => {
			const health = await service.healthCheck();
			expect(health.status).toBe('unhealthy');
			expect(health.connection.primary).toBe(false);
		});
	});
});
