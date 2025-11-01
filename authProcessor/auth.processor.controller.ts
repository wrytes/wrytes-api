import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authorization Processor')
@Controller('authorization/processor')
export class AuthorizationProcessorController {
	constructor() {}

	@Get('supported')
	@ApiOperation({ summary: '' })
	async getSupported() {}
}
