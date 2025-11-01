import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('authorization')
@Controller('authorization/processor')
export class AuthorizationProcessorController {
	constructor() {}

	@Get('supported')
	@ApiOperation({ summary: '' })
	async getSupported() {}
}
