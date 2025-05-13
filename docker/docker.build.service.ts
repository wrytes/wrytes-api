import { Injectable } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { CreateDockerfileOptions, CreateImageOptions } from './docker.build.types';
import { Readable } from 'stream';
import Tar from 'tar-stream';

@Injectable()
export class DockerBuildService {
	constructor(private readonly docker: DockerClient) {}

	createDockerfile(options: CreateDockerfileOptions): string {
		const envKeys: string[] = Object.keys(options.env ?? {});
		const env: string[] = envKeys.map((k) => `ENV ${k}=${options.env[k]}`);

		return `
FROM ${options.image}

${env.join('\n')}
ENV DOCKER_APP_HOME=/app

WORKDIR $DOCKER_APP_HOME

RUN git clone -b ${options.branch ?? 'main'} ${options.git} $DOCKER_APP_HOME

WORKDIR $DOCKER_APP_HOME

# add user, ownership of directory
RUN groupadd -r appuser
RUN useradd -r -g appuser appuser
RUN chown -R appuser:appuser $DOCKER_APP_HOME

# switch to user
USER appuser

RUN ${options.build ?? 'yarn install && yarn run build'}

EXPOSE ${options.port ?? 3000}

CMD ["bash", "-c", "${options.run ?? 'yarn run start'}"]
`;
	}

	createTarStream(content: string): Readable {
		const stream = Tar.pack();
		stream.entry({ name: 'Dockerfile' }, content);
		stream.finalize();
		return stream;
	}

	async buildImageFromStream(streamContent: Readable, tag: string): Promise<string | any> {
		return new Promise((resolve, reject) => {
			this.docker.buildImage(
				streamContent,
				{
					t: tag,
				},
				(err, stream) => {
					if (err) return reject(err);

					if (stream) {
						stream.pipe(process.stdout);
						stream.on('end', () => resolve('build completed'));
						stream.on('error', (buildError) => reject(buildError));
					} else {
						reject(new Error('no response'));
					}
				}
			);
		});
	}

	async buildImage(options: CreateImageOptions): Promise<string> {
		const stream = this.createTarStream(this.createDockerfile(options));
		return this.buildImageFromStream(stream, options.tag);
	}
}
