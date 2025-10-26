import { Injectable, Logger } from '@nestjs/common';
import { DeribitApiClient, GrantType } from '@wrytlabs/deribit-api-client';
import { CONFIG } from '../api.config';

@Injectable()
export class DeribitClientService extends DeribitApiClient {
	private readonly logger = new Logger(this.constructor.name);

	constructor() {
		super({
			type: GrantType.client_credentials,
			baseUrl: 'wss://www.deribit.com/ws/api/v2',
			clientId: CONFIG.deribit.clientId,
			clientSecret: CONFIG.deribit.clientSecret,
		});
	}
}
