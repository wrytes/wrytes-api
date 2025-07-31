import { Injectable, Logger } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { DATABASE_CONFIG } from '../api.config';
import { PostgresContainerConfig, ContainerHealth } from './docker.database.types';

@Injectable()
export class DockerDatabaseService {
	private readonly logger = new Logger(this.constructor.name);
	private containerConfig: PostgresContainerConfig;

	constructor(private readonly dockerClient: DockerClient) {
		this.containerConfig = DATABASE_CONFIG.dockerContainer;
	}

	async deployPostgresContainer(): Promise<boolean> {
		try {
			this.logger.log('Deploying PostgreSQL container...');

			// Wait for Docker client to be ready
			await this.dockerClient.waitForReady();

			// Check if container already exists
			const existingContainer = await this.findExistingContainer();
			if (existingContainer) {
				this.logger.log('Existing PostgreSQL container found, checking status...');

				// Check if it's running
				if (existingContainer.State === 'running') {
					this.logger.log('PostgreSQL container is already running');
					return await this.isContainerHealthy();
				}

				// Start existing container
				await this.dockerClient.getContainer(existingContainer.Id).start();
				this.logger.log('Started existing PostgreSQL container');
			} else {
				// Create new container
				await this.createNewContainer();
			}

			// Wait for container to be healthy
			return await this.waitForHealthy();
		} catch (error) {
			this.logger.error('Failed to deploy PostgreSQL container:', error);
			return false;
		}
	}

	async isContainerHealthy(): Promise<boolean> {
		try {
			const container = await this.findExistingContainer();
			if (!container) return false;

			const containerInfo = await this.dockerClient.getContainer(container.Id).inspect();

			// Check if container is running
			if (!containerInfo.State.Running) return false;

			// Check health status if available
			if (containerInfo.State.Health) {
				return containerInfo.State.Health.Status === 'healthy';
			}

			// If no health check, assume healthy if running
			return true;
		} catch (error) {
			this.logger.error('Error checking container health:', error);
			return false;
		}
	}

	async getContainerHealth(): Promise<ContainerHealth | null> {
		try {
			const container = await this.findExistingContainer();
			if (!container) return null;

			const containerInfo = await this.dockerClient.getContainer(container.Id).inspect();

			const startedAt = new Date(containerInfo.State.StartedAt);
			const uptime = Date.now() - startedAt.getTime();

			let status: ContainerHealth['status'] = 'unhealthy';
			if (containerInfo.State.Running) {
				if (containerInfo.State.Health) {
					status = containerInfo.State.Health.Status === 'healthy' ? 'healthy' : 'unhealthy';
				} else {
					status = 'healthy'; // Assume healthy if running and no health check
				}
			} else if (containerInfo.State.Status === 'created' || containerInfo.State.Status === 'restarting') {
				status = 'starting';
			}

			return {
				status,
				uptime,
				lastCheck: new Date(),
			};
		} catch (error) {
			this.logger.error('Error getting container health:', error);
			return null;
		}
	}

	async stopContainer(): Promise<void> {
		try {
			const container = await this.findExistingContainer();
			if (container) {
				await this.dockerClient.getContainer(container.Id).stop();
				this.logger.log('Stopped PostgreSQL container');
			}
		} catch (error) {
			this.logger.error('Error stopping container:', error);
		}
	}

	async removeContainer(): Promise<void> {
		try {
			const container = await this.findExistingContainer();
			if (container) {
				// Stop first if running
				if (container.State === 'running') {
					await this.stopContainer();
				}

				await this.dockerClient.getContainer(container.Id).remove();
				this.logger.log('Removed PostgreSQL container');
			}
		} catch (error) {
			this.logger.error('Error removing container:', error);
		}
	}

	getDatabaseUrl(): string {
		return `postgresql://${this.containerConfig.user}:${this.containerConfig.password}@localhost:${this.containerConfig.port}/${this.containerConfig.database}?schema=public`;
	}

	private async findExistingContainer() {
		const containers = await this.dockerClient.listContainers({ all: true });
		return containers.find((container) => container.Names.some((name) => name === `/${this.containerConfig.name}`));
	}

	private async createNewContainer() {
		const createOptions = {
			Image: this.containerConfig.image,
			name: this.containerConfig.name,
			Env: [
				`POSTGRES_DB=${this.containerConfig.database}`,
				`POSTGRES_USER=${this.containerConfig.user}`,
				`POSTGRES_PASSWORD=${this.containerConfig.password}`,
			],
			ExposedPorts: {
				'5432/tcp': {},
			},
			HostConfig: {
				PortBindings: {
					'5432/tcp': [{ HostPort: this.containerConfig.port }],
				},
			},
			Healthcheck: {
				Test: ['CMD-SHELL', `pg_isready -U ${this.containerConfig.user}`],
				Interval: 10000000000,
				Timeout: 5000000000,
				Retries: 5,
			},
		};

		this.logger.log(`Creating PostgreSQL container with image: ${this.containerConfig.image}`);

		try {
			const stream = await this.dockerClient.pull(this.containerConfig.image);

			await new Promise((resolve, reject) => {
				this.dockerClient.modem.followProgress(stream, (err, res) => {
					if (err) reject(err);
					else resolve(res);
				});
			});
		} catch (error) {
			this.logger.error(`Failed to pull image ${this.containerConfig.image}:`, error);
			throw error;
		}

		const container = await this.dockerClient.createContainer(createOptions);
		await container.start();

		this.logger.log('Created and started new PostgreSQL container');
	}

	private async waitForHealthy(timeoutMs = 120000): Promise<boolean> {
		const startTime = Date.now();
		let checkCount = 0;

		while (Date.now() - startTime < timeoutMs) {
			checkCount++;

			if (await this.isContainerHealthy()) {
				this.logger.log(`PostgreSQL container is healthy after ${Math.round((Date.now() - startTime) / 1000)}s`);
				return true;
			}

			// Log less frequently after initial checks
			if (checkCount <= 5 || checkCount % 5 === 0) {
				const elapsed = Math.round((Date.now() - startTime) / 1000);
				this.logger.log(`Waiting for container to be ready (${elapsed}s elapsed)...`);
			}

			await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
		}

		this.logger.error(`PostgreSQL container failed to become healthy within ${timeoutMs / 1000}s (${checkCount} checks)`);
		return false;
	}
}
