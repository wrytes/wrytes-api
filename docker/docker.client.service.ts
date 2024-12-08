import Dockerode from 'dockerode';

import { Injectable } from '@nestjs/common';

@Injectable()
export class DockerClient extends Dockerode {
	constructor() {
		const socketPath: string = process.env.SOCKETPATH || '/var/run/docker.sock';
		super({ socketPath });
	}
}
