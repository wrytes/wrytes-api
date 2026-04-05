import { Controller, Get, Delete, Query, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SafeService } from './safe.service';
import { ScopesGuard } from '../../common/guards/scopes.guard';
import { RequireScopes } from '../../common/decorators/require-scopes.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import { ChainId, SUPPORTED_CHAIN_IDS } from '../wallet/wallet.types';

@Controller('safe')
@ApiTags('Safe')
@UseGuards(ScopesGuard)
@ApiSecurity('api-key')
@RequireScopes('SAFE')
export class SafeController {
	constructor(private readonly safeService: SafeService) {}

	@Get('wallets')
	@ApiOperation({ summary: 'List all Safe wallets for the current user' })
	@ApiQuery({ name: 'chainId', required: false, type: Number, example: 1 })
	async listWallets(
		@CurrentUser() user: User,
		@Query('chainId') chainIdParam?: string,
	) {
		const chainId = chainIdParam ? (Number(chainIdParam) as ChainId) : undefined;
		const wallets = await this.safeService.listWallets(user.id, chainId);
		return { wallets };
	}

	@Get('wallet')
	@ApiOperation({ summary: 'Get or predict a Safe wallet address for the current user' })
	@ApiQuery({ name: 'chainId', required: false, type: Number, example: 1 })
	@ApiQuery({ name: 'label', required: false, type: String, example: 'primary' })
	async getWallet(
		@CurrentUser() user: User,
		@Query('chainId') chainIdParam?: string,
		@Query('label') label = 'primary',
	) {
		const chainId = (chainIdParam ? Number(chainIdParam) : 1) as ChainId;
		if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
			throw new Error(`Unsupported chainId: ${chainId}`);
		}

		const wallet = await this.safeService.getOrCreate(user.id, chainId, label);
		return {
			address: wallet.address,
			chainId: wallet.chainId,
			label: wallet.label,
			deployed: wallet.deployed,
		};
	}

	@Delete('wallet/:id')
	@HttpCode(HttpStatus.OK)
	@RequireScopes('ADMIN')
	@ApiOperation({ summary: 'Delete a Safe wallet entry (admin only). Only undeployed wallets can be deleted unless force=true.' })
	@ApiParam({ name: 'id', description: 'Safe wallet DB id' })
	@ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Delete even if deployed' })
	@ApiResponse({ status: 400, description: 'Wallet is deployed — use force=true to override' })
	@ApiResponse({ status: 404, description: 'Wallet not found' })
	async deleteWallet(@Param('id') id: string, @Query('force') force?: string) {
		await this.safeService.deleteWallet(id, force === 'true');
		return { deleted: id };
	}
}
