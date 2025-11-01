import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeribitClientService } from './deribit.client.service';
import { Currency } from '@wrytlabs/deribit-api-client';

@ApiTags('Deribit')
@Controller('deribit')
export class DeribitController {
	constructor(private readonly client: DeribitClientService) {}

	@Get('account')
	@ApiOperation({ summary: 'Get Deribit account information' })
	@ApiResponse({ status: 200, description: 'Account information retrieved successfully' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	async getAccount() {
		return this.client.account.getAccountSummary({
			currency: Currency.BTC,
		});
	}
}
