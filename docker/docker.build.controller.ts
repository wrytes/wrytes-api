import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DockerBuildService } from './docker.build.service';

@ApiTags('Docker Controller')
@Controller('docker')
export class DockerBuildController {
	constructor(private readonly docker: DockerBuildService) {}

	@Get('/build')
	@ApiResponse({
		description: '',
	})
	@ApiQuery({ name: 'image', required: true, description: '' })
	@ApiQuery({ name: 'git', required: true, description: '' })
	@ApiQuery({ name: 'tag', required: true, description: '' })
	@ApiQuery({ name: 'branch', required: false, description: '' })
	@ApiQuery({ name: 'env', required: false, description: '' })
	@ApiQuery({ name: 'build', required: false, description: '' })
	@ApiQuery({ name: 'run', required: false, description: '' })
	@ApiQuery({ name: 'port', required: false, description: '' })
	async build(
		@Query('image') image: string,
		@Query('git') git: string,
		@Query('tag') tag: string,
		@Query('branch') branch?: string,
		@Query('env') env?: string,
		@Query('build') build?: string,
		@Query('run') run?: string,
		@Query('port') port?: string
	) {
		try {
			// parse as object
			let parsed: object = {};
			if (env) {
				parsed = JSON.parse(env);
				console.log(typeof parsed);
				// if (typeof env != 'object') throw { error: 'Could not parse env param' };
			}

			const params = {
				image,
				git,
				branch,
				env: parsed,
				build,
				run,
				port: Number(port),
				tag,
			};

			return this.docker.buildImage(params);
		} catch (error) {
			return error;
		}
	}
}
