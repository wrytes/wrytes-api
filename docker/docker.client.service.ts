import Dockerode from 'dockerode';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DockerClient extends Dockerode {
	private readonly logger = new Logger(this.constructor.name);

	constructor() {
		const socketPath: string = process.env.SOCKETPATH || '/var/run/docker.sock';
		super({ socketPath });

		this.swarmInspect()
			.then((e) => {
				this.logger.warn(`Swarm detected. ID: ${e.ID}`);
			})
			.catch(async (error) => {
				this.logger.error(error.json.message);
				const init = await this.swarmInit({ ListenAddr: '0.0.0.0:2377' });
				this.logger.warn(`Swarm initialized. ID: ${init}`);
			});
	}
}
