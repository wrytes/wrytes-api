import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { DockerDeployService } from './docker.deploy.service';

@ApiTags('Docker Controller')
@Controller('docker')
export class DockerDeployController {
	constructor(private readonly dockerDeploy: DockerDeployService) {}

	@Get('/deploy')
	@ApiResponse({
		description: '',
	})
	async deploy() {
		try {
			// // parse as object
			// let parsed: object = {};
			// if (env) {
			// 	parsed = JSON.parse(env);
			// 	console.log(typeof parsed);
			// 	// if (typeof env != 'object') throw { error: 'Could not parse env param' };
			// }

			// const params = {
			// 	image,
			// 	git,
			// 	branch,
			// 	env: parsed,
			// 	build,
			// 	run,
			// 	port: Number(port),
			// 	tag,
			// };

			return this.dockerDeploy.createServiceTest();
		} catch (error) {
			return error;
		}
	}
}
