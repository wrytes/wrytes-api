import Dockerode from 'dockerode';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DockerClient extends Dockerode {
	private readonly logger = new Logger(this.constructor.name);
	private isReady = false;
	private readyPromise: Promise<void>;

	constructor() {
		const socketPath: string = process.env.SOCKETPATH || '/var/run/docker.sock';
		super({ socketPath });

		this.readyPromise = this.initialize();
	}

	private async initialize(): Promise<void> {
		try {
			const d = await this.info();
			const id = d?.Swarm?.Cluster?.ID;

			if (id) {
				this.logger.warn(`Swarm detected. ID: ${id}`);
			} else {
				const init = await this.swarmInit({ ListenAddr: '0.0.0.0:2377' });
				this.logger.warn(`Swarm initialized. ID: ${init}`);
			}

			this.isReady = true;
			this.logger.log('Docker client is ready');
		} catch (error) {
			this.logger.error('Failed to initialize Docker client:', error);
			throw error;
		}
	}

	async waitForReady(timeoutMs = 30000): Promise<void> {
		if (this.isReady) {
			return;
		}

		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Docker client initialization timeout')), timeoutMs);
		});

		await Promise.race([this.readyPromise, timeoutPromise]);
	}

	getReadyStatus(): boolean {
		return this.isReady;
	}
}
