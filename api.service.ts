import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { CONFIG, VIEM_CONFIG } from 'api.config';
import { TelegramService } from 'telegram/telegram.service';
import { Chain, mainnet, polygon } from 'viem/chains';

export const INDEXING_TIMEOUT_COUNT: number = 5;
export const POLLING_DELAY: { [key: Chain['id']]: number } = {
	[mainnet.id]: 6_000, // blocktime: 12s
	[polygon.id]: 12_000, // blocktime: 2s, skip: 5 blks
};

@Injectable()
export class ApiService {
	private readonly logger = new Logger(this.constructor.name);
	private indexing: boolean = false;
	private indexingTimeoutCount: number = 0;
	private fetchedBlockheight: number = 0;

	constructor(private readonly telegram: TelegramService) {
		setTimeout(() => this.updateBlockheight(), 100);
	}

	async updateWorkflow() {
		this.logger.log(`Fetched blockheight: ${this.fetchedBlockheight}`);
		const promises = [this.telegram.updateTelegram()];

		return Promise.all(promises);
	}

	@Interval(POLLING_DELAY[CONFIG.chain.id])
	async updateBlockheight() {
		const tmp: number = parseInt((await VIEM_CONFIG.getBlockNumber()).toString());
		this.indexingTimeoutCount += 1;
		if (tmp > this.fetchedBlockheight && !this.indexing) {
			this.indexing = true;
			await this.updateWorkflow();
			this.indexingTimeoutCount = 0;
			this.fetchedBlockheight = tmp;
			this.indexing = false;
		}
		if (this.indexingTimeoutCount >= INDEXING_TIMEOUT_COUNT && this.indexing) {
			this.indexingTimeoutCount = 0;
			this.indexing = false;
		}
	}
}
