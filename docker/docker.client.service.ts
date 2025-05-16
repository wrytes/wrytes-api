import Dockerode from 'dockerode';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DockerClient extends Dockerode {
	private readonly logger = new Logger(this.constructor.name);

	constructor() {
		const socketPath: string = process.env.SOCKETPATH || '/var/run/docker.sock';
		super({ socketPath });

		this.info()
			.then(async (d) => {
				const id = d?.Swarm?.Cluster?.ID;

				if (id) {
					this.logger.warn(`Swarm detected. ID: ${id}`);
				} else {
					const init = await this.swarmInit({ ListenAddr: '0.0.0.0:2377' });
					this.logger.warn(`Swarm initialized. ID: ${init}`);
				}
			})
			.catch((error) => this.logger.error(error));
	}
}
