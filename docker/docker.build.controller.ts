import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Docker Build Controller')
@Controller('docker/build')
export class DockerBuildController {
	@Get('list')
	@ApiResponse({
		description: '',
	})
	getCollateralListArray() {
		return {
			message: 'Hi',
		};
	}
}
