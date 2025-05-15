import { Injectable } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import Dockerode from 'dockerode';

@Injectable()
export class DockerDeployService {
	constructor(private readonly docker: DockerClient) {}

	async createService(options: Dockerode.CreateServiceOptions): Promise<Dockerode.Service> {
		return this.docker.createService(options);
	}

	async createServiceTest(): Promise<Dockerode.Service> {
		return this.docker.createService({
			Name: 'nginx-service',
			TaskTemplate: {
				ContainerSpec: {
					Image: 'nginx:latest',
					Mounts: [],
				},
				RestartPolicy: {
					Condition: 'none',
				},
			},
			Mode: {
				Replicated: {
					Replicas: 1,
				},
			},
			EndpointSpec: {
				Ports: [
					{
						Protocol: 'tcp',
						TargetPort: 80,
						PublishedPort: 8080,
						PublishMode: 'ingress',
					},
				],
			},
		});
	}

	// async buildImage(options: CreateImageOptions): Promise<string> {
	// 	const stream = this.createTarStream(this.createDockerfile(options));
	// 	return this.buildImageFromStream(stream, options.tag);
	// }
}
