import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthorizationProcessorService {
	private readonly logger = new Logger(this.constructor.name);

	constructor() {}
}
