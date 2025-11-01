import { Controller, Get, Post, Body, Param, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthorizationProcessorService } from './auth.processor.service';
import { AuthorizationInputDto } from './auth.processor.dto';

@ApiTags('Authorization Processor')
@Controller('authorization/processor')
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
		summary: 'Comprehensive Authorization Verification',
		description: `
		**Performs detailed verification and returns comprehensive status for all authorization checks.**
		
		**Verification Components:**
		- ✅ **Signature Check**: Recovers signer address from EIP-712 signature
		- ✅ **Authorization Check**: Validates timing, nonce usage, and smart contract authorization
		- ✅ **Allowance Check**: Verifies allowance availability for the operation
		
		**Response Structure:**
		Returns detailed breakdown of each verification step with specific error messages,
		current state information, and an overall executable status.
		
		**Use Cases:**
		- Pre-flight validation before settlement
		- Detailed debugging of authorization issues
		- Client-side verification with comprehensive feedback
		- Integration testing and development workflow
		`,
	})
	@ApiBody({ type: AuthorizationInputDto })
	@ApiResponse({
		status: 200,
		description: 'Comprehensive verification results with detailed breakdown',
		schema: {
			type: 'object',
			properties: {
				executable: { type: 'boolean', example: true, description: 'Whether authorization can be executed immediately' },
				signature: {
					type: 'object',
					properties: {
						isValid: { type: 'boolean', example: true },
						signer: { type: 'string', example: '0x742d35cc0cf6c4976e3e4b7a2c5ff0e7e2e4a8c1', nullable: true },
						error: { type: 'string', example: null, nullable: true },
					},
				},
				authorization: {
					type: 'object',
					properties: {
						isValid: { type: 'boolean', example: true },
						nonceValid: { type: 'boolean', example: true },
						notPending: { type: 'boolean', example: true },
						notExpired: { type: 'boolean', example: true },
						currentTime: { type: 'number', example: 1698765432 },
						validAfter: { type: 'number', example: 1698765400 },
						validBefore: { type: 'number', example: 1698851832 },
						error: { type: 'string', example: null, nullable: true },
					},
				},
				allowance: {
					type: 'object',
					properties: {
						isValid: { type: 'boolean', example: true },
						requested: { type: 'string', example: '1000000000000000000' },
						reduce: { type: 'string', example: '1000000000000000000' },
						error: { type: 'string', example: null, nullable: true },
					},
				},
			},
		},
	})
	@ApiResponse({ status: 400, description: 'Invalid input format or validation failed' })
	async verifyAuthorization(@Body(ValidationPipe) auth: AuthorizationInputDto) {
		return await this.authProcessor.checkCompleteAuthorization(auth);
	}

	@Post('settle')
	@ApiOperation({
		summary: 'Flexible Authorization Settlement',
		description: `
		**Creates and stores an authorization for settlement with flexible validation.**
		
		This endpoint has a more permissive approach compared to \`/verify\`:
		
		**Required Validations (will reject):**
		- ✅ **Valid signature** - Must pass EIP-712 signature verification
		- ✅ **Unique nonce** - Prevents duplicate authorizations from same signer
		- ✅ **Basic time integrity** - Ensures validAfter < validBefore
		
		**Flexible Validations (accepts but records status):**
		- ⚠️ **Future authorizations** - Accepts if validAfter is in future (status: TIMELOCK)
		- ⚠️ **Missing allowance** - Accepts if allowance insufficient (status: AUTHORIZE)
		- ⚠️ **Expired authorizations** - Accepts expired auths (status: EXPIRED)
		
		**Status Assignment Logic:**
		- \`VERIFIED\` → Basic signature validation passed
		- \`AUTHORIZE\` → Waiting for sufficient allowance
		- \`TIMELOCK\` → Valid but not yet active (validAfter in future)
		- \`READY\` → Fully validated and executable
		- \`EXPIRED\` → Past validBefore timestamp
		
		**Use Cases:**
		- Batch processing of authorizations
		- Storing future-dated authorizations
		- Flexible settlement pipeline with status tracking
		- Retry mechanisms for failed allowance checks
		`,
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

	@Get('pending')
	@ApiOperation({
		summary: 'Get Pending Authorizations',
		description: `
		**Retrieves authorizations that are waiting for conditions to be met before settlement.**
		
		**Included Status Types:**
		- \`VERIFIED\` → Basic signature validation passed, pending further checks
		- \`AUTHORIZE\` → Waiting for sufficient allowance on smart contract
		- \`TIMELOCK\` → Valid authorization but not yet active (validAfter in future)
		
		**Use Cases:**
		- Monitoring authorizations awaiting conditions
		- Batch processing queue management
		- Status dashboard for pending settlements
		- Retry logic for failed allowance checks
		- Time-based settlement scheduling
		
		**Response:** Array of authorization objects with current status and timing information.
		`,
	})
	@ApiResponse({
		status: 200,
		description: 'List of authorizations waiting for conditions',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string', example: 'clr123456789abcdef' },
					signer: { type: 'string', example: '0x742d35cc0cf6c4976e3e4b7a2c5ff0e7e2e4a8c1' },
					status: { type: 'string', example: 'TIMELOCK', enum: ['VERIFIED', 'AUTHORIZE', 'TIMELOCK'] },
					validAfter: { type: 'string', example: '1698765432' },
					validBefore: { type: 'string', example: '1698851832' },
					amount: { type: 'string', example: '1000000000000000000' },
					createdAt: { type: 'string', format: 'date-time' },
				},
			},
		},
	})
	async getWaitingAuth() {
		return await this.authProcessor.getPendingAuthorizations();
	}

	@Get('batching')
	@ApiOperation({
		summary: 'Get Ready Authorizations for Batching',
		description: `
		**Retrieves authorizations with READY status that are prepared for immediate settlement.**
		
		**READY Status Criteria:**
		- ✅ Valid signature verification
		- ✅ Sufficient allowance confirmed
		- ✅ Authorization timing is active (validAfter ≤ now < validBefore)
		- ✅ Nonce is unused
		- ✅ All smart contract validations passed
		
		**Use Cases:**
		- Batch processing queue for settlement
		- Real-time settlement candidate identification
		- Settlement service integration
		- Performance monitoring of ready authorizations
		- Capacity planning for settlement operations
		
		**Response:** Array of immediately executable authorization objects.
		`,
	})
	@ApiResponse({
		status: 200,
		description: 'List of authorizations ready for immediate settlement',
		schema: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string', example: 'clr123456789abcdef' },
					signer: { type: 'string', example: '0x742d35cc0cf6c4976e3e4b7a2c5ff0e7e2e4a8c1' },
					status: { type: 'string', example: 'READY', enum: ['READY'] },
					kind: { type: 'number', example: 0, description: 'Operation type: 0=TRANSFER, 1=DEPOSIT, 2=PROCESS, 3=CLAIM' },
					amount: { type: 'string', example: '1000000000000000000' },
					token: { type: 'string', example: '0xa0b86a33e6741e6aa4cb2b3d6c81b7b8a3e1f2d4' },
					allowanceAmount: { type: 'string', example: '1000000000000000000' },
					createdAt: { type: 'string', format: 'date-time' },
				},
			},
		},
	})
	async getUnsettledAuthorizations() {
		return await this.authProcessor.getUnsettledAuthorizations();
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
	async getAuthorizationsBySigner(@Param('signer') signer: string) {
		if (!signer.match(/^0x[a-fA-F0-9]{40}$/)) {
			throw new Error('Invalid signer address format');
		}

		return await this.authProcessor.getAuthorizationsBySignerAndNonce(signer);
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
