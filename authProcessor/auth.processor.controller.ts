import { Controller, Get, Post, Body, Param, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthorizationProcessorService } from './auth.processor.service';
import { Public } from '../auth/decorators/public.decorator';
import { AuthorizationInputDto } from './auth.processor.dto';

@ApiTags('Authorization Processor')
@Controller('authorization/processor')
@Public()
export class AuthorizationProcessorController {
	constructor(private readonly authProcessor: AuthorizationProcessorService) {}

	@Get('supported')
	@ApiOperation({
		summary: 'Get supported network information',
		description: 'Returns information about the supported blockchain network and contract details',
	})
	@ApiResponse({
		status: 200,
		description: 'Network information retrieved successfully',
		schema: {
			type: 'object',
			properties: {
				name: { type: 'string', example: 'Ethereum Mainnet' },
				chainId: { type: 'number', example: 1 },
				contractAddress: { type: 'string', example: '0x3874161854D0D5f13B4De2cB5061d9cff547466E' },
				blockNumber: { type: 'number', example: 18500000 },
			},
		},
	})
	async getSupported() {
		return await this.authProcessor.getSupportedNetwork();
	}

	@Post('verify')
	@ApiOperation({
		summary: 'Verify authorization signature and validity',
		description: 'Performs complete verification: signature recovery, authorization validation, and allowance checking',
	})
	@ApiBody({ type: AuthorizationInputDto })
	@ApiResponse({
		status: 200,
		description: 'Authorization verified successfully',
		schema: {
			type: 'object',
			properties: {
				signer: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
				authorizationValid: { type: 'boolean', example: true },
				allowanceAmount: { type: 'string', example: '1000000000000000000' },
			},
		},
	})
	@ApiResponse({ status: 400, description: 'Invalid signature or authorization' })
	async verifyAuthorization(@Body(ValidationPipe) auth: AuthorizationInputDto) {
		return await this.authProcessor.verifyCompleteAuthorization(auth);
	}

	@Post('settle')
	@ApiOperation({
		summary: 'Create and store authorization for settlement',
		description: 'Verifies the authorization and creates a database entry with status "created" for batching',
	})
	@ApiBody({ type: AuthorizationInputDto })
	@ApiResponse({
		status: 201,
		description: 'Authorization created successfully',
		schema: {
			type: 'object',
			properties: {
				id: { type: 'string', example: 'clr123456789' },
				signer: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
				status: { type: 'string', example: 'VERIFIED' },
				createdAt: { type: 'string', format: 'date-time' },
			},
		},
	})
	@ApiResponse({ status: 400, description: 'Invalid authorization or duplicate nonce' })
	async settleAuthorization(@Body(ValidationPipe) auth: AuthorizationInputDto) {
		return await this.authProcessor.createAuthorization(auth);
	}

	@Get('batching')
	@ApiOperation({
		summary: 'Get unsettled authorization processes',
		description: 'Shows authorization batches that are pending settlement, either time-based or volume-based',
	})
	@ApiResponse({
		status: 200,
		description: 'Unsettled batches retrieved successfully',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					batchNumber: { type: 'number' },
					status: { type: 'string', enum: ['PENDING', 'READY', 'SUBMITTING', 'SUBMITTED', 'CONFIRMED', 'FAILED'] },
					members: { type: 'array', items: { type: 'object' } },
					createdAt: { type: 'string', format: 'date-time' },
				},
			},
		},
	})
	async getUnsettledBatches() {
		return await this.authProcessor.getUnsettledBatches();
	}

	@Post('status')
	@ApiOperation({
		summary: 'Get authorization status by authorization data',
		description: 'Returns the current status of an authorization by providing the full authorization object',
	})
	@ApiBody({ type: AuthorizationInputDto })
	@ApiResponse({
		status: 200,
		description: 'Authorization status retrieved successfully',
		schema: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				signer: { type: 'string' },
				status: { type: 'string' },
				batchMembers: { type: 'array', items: { type: 'object' } },
				createdAt: { type: 'string', format: 'date-time' },
			},
		},
	})
	@ApiResponse({ status: 404, description: 'Authorization not found' })
	async getAuthorizationStatus(@Body(ValidationPipe) auth: AuthorizationInputDto) {
		return await this.authProcessor.getAuthorizationStatus(auth);
	}

	@Get('status/:signer')
	@ApiOperation({
		summary: 'Get authorizations by signer address',
		description: 'Returns all authorizations for a specific signer, optionally filtered by nonce',
	})
	@ApiParam({ name: 'signer', description: 'Ethereum address of the signer' })
	@ApiResponse({
		status: 200,
		description: 'Authorizations retrieved successfully',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					nonce: { type: 'string' },
					status: { type: 'string' },
					amount: { type: 'string' },
					createdAt: { type: 'string', format: 'date-time' },
				},
			},
		},
	})
	async getAuthorizationsBySigner(@Param('signer') signer: string, @Query('nonce') nonce?: string) {
		if (!signer.match(/^0x[a-fA-F0-9]{40}$/)) {
			throw new Error('Invalid signer address format');
		}

		return await this.authProcessor.getAuthorizationsBySignerAndNonce(signer, nonce);
	}

	@Get('status/:signer/:nonce')
	@ApiOperation({
		summary: 'Get specific authorization by signer and nonce',
		description: 'Returns a specific authorization identified by signer address and nonce',
	})
	@ApiParam({ name: 'signer', description: 'Ethereum address of the signer' })
	@ApiParam({ name: 'nonce', description: 'Nonce value as hex string' })
	@ApiResponse({
		status: 200,
		description: 'Authorization retrieved successfully',
	})
	async getAuthorizationBySignerAndNonce(@Param('signer') signer: string, @Param('nonce') nonce: string) {
		if (!signer.match(/^0x[a-fA-F0-9]{40}$/)) {
			throw new Error('Invalid signer address format');
		}

		if (!nonce.match(/^0x[a-fA-F0-9]{64}$/)) {
			throw new Error('Invalid nonce format');
		}

		const authorizations = await this.authProcessor.getAuthorizationsBySignerAndNonce(signer, nonce);
		return authorizations[0] || null;
	}
}
