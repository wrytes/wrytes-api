import { IsEnum, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AuthorizationInput, AuthorizationOperationKind } from './auth.processor.types';

export class AuthorizationInputDto implements AuthorizationInput {
	@ApiProperty({
		description: 'Type of authorization operation to perform',
		enum: AuthorizationOperationKind,
		example: AuthorizationOperationKind.TRANSFER,
		enumName: 'AuthorizationOperationKind',
	})
	@IsEnum(AuthorizationOperationKind, { message: 'Invalid operation kind. Must be 0 (TRANSFER), 1 (DEPOSIT), 2 (PROCESS), or 3 (CLAIM)' })
	kind: AuthorizationOperationKind;

	@ApiProperty({
		description: 'Ethereum address of the token owner (from address)',
		example: '0x742d35cc0cf6c4976e3e4b7a2c5ff0e7e2e4a8c1',
		pattern: '^0x[a-fA-F0-9]{40}$',
		minLength: 42,
		maxLength: 42,
	})
	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format for "from" field' })
	from: string;

	@ApiProperty({
		description: 'Ethereum address of the recipient (to address)',
		example: '0x8ba1f109551bd432803012645bd032e3e2e4a9c2',
		pattern: '^0x[a-fA-F0-9]{40}$',
		minLength: 42,
		maxLength: 42,
	})
	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format for "to" field' })
	to: string;

	@ApiProperty({
		description: 'Contract address of the ERC-20 token being transferred',
		example: '0xa0b86a33e6741e6aa4cb2b3d6c81b7b8a3e1f2d4',
		pattern: '^0x[a-fA-F0-9]{40}$',
		minLength: 42,
		maxLength: 42,
	})
	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid token address format' })
	token: string;

	@ApiProperty({
		description: 'Amount of tokens to transfer (in smallest unit, e.g., wei for ETH)',
		example: '1000000000000000000',
		pattern: '^\\d+$',
	})
	@IsString()
	@Matches(/^\d+$/, { message: 'Amount must be a valid number string (no decimals)' })
	amount: string;

	@ApiProperty({
		description: 'Unique nonce to prevent replay attacks (32-byte hex string)',
		example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
		pattern: '^0x[a-fA-F0-9]{64}$',
		minLength: 66,
		maxLength: 66,
	})
	@IsString()
	@Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid nonce format. Must be 32-byte hex string' })
	nonce: string;

	@ApiProperty({
		description: 'Unix timestamp after which the authorization becomes valid',
		example: '1698765432',
		pattern: '^\\d+$',
	})
	@IsString()
	@Matches(/^\d+$/, { message: 'ValidAfter must be a valid Unix timestamp string' })
	validAfter: string;

	@ApiProperty({
		description: 'Unix timestamp before which the authorization expires',
		example: '1698851832',
		pattern: '^\\d+$',
	})
	@IsString()
	@Matches(/^\d+$/, { message: 'ValidBefore must be a valid Unix timestamp string' })
	validBefore: string;

	@ApiProperty({
		description: 'EIP-712 signature of the authorization (hex string with 0x prefix)',
		example:
			'0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
		pattern: '^0x[a-fA-F0-9]+$',
		minLength: 132,
	})
	@IsString()
	@Matches(/^0x[a-fA-F0-9]+$/, { message: 'Invalid signature format. Must be hex string with 0x prefix' })
	signature: string;
}

export class SupportedNetworkResponseDto {
	@ApiProperty({
		description: 'Name of the blockchain network',
		example: 'Ethereum Mainnet',
	})
	name: string;

	@ApiProperty({
		description: 'Chain ID of the blockchain network',
		example: 1,
	})
	chainId: number;

	@ApiProperty({
		description: 'Address of the Authorization Processor smart contract',
		example: '0x3874161854D0D5f13B4De2cB5061d9cff547466E',
	})
	contractAddress: string;

	@ApiProperty({
		description: 'Current block number (optional, for network health)',
		example: 18500000,
		required: false,
	})
	blockNumber?: number;
}

export class VerificationResponseDto {
	@ApiProperty({
		description: 'Recovered signer address from the authorization signature',
		example: '0x742d35cc0cf6c4976e3e4b7a2c5ff0e7e2e4a8c1',
	})
	signer: string;

	@ApiProperty({
		description: 'Whether the authorization passed all validation checks',
		example: true,
	})
	authorizationValid: boolean;

	@ApiProperty({
		description: 'Available allowance amount for the signer',
		example: '5000000000000000000',
	})
	allowanceAmount: string;
}

export class AuthorizationResponseDto {
	@ApiProperty({
		description: 'Unique identifier for the authorization record',
		example: 'clr123456789abcdef',
	})
	id: string;

	@ApiProperty({
		description: 'Recovered signer address',
		example: '0x742d35cc0cf6c4976e3e4b7a2c5ff0e7e2e4a8c1',
	})
	signer: string;

	@ApiProperty({
		description: 'Current status of the authorization',
		example: 'VERIFIED',
		enum: ['VERIFIED', 'AUTHORIZE', 'TIMELOCK', 'READY', 'EXPIRED', 'SETTLED', 'FAILED', 'CANCELLED'],
	})
	status: string;

	@ApiProperty({
		description: 'Timestamp when the authorization was created',
		example: '2023-10-31T12:00:00.000Z',
	})
	createdAt: string;

	@ApiProperty({
		description: 'Operation kind',
		example: 0,
	})
	kind: number;

	@ApiProperty({
		description: 'Token amount',
		example: '1000000000000000000',
	})
	amount: string;

	@ApiProperty({
		description: 'Nonce used for this authorization',
		example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
	})
	nonce: string;
}

export class BatchResponseDto {
	@ApiProperty({
		description: 'Unique identifier for the batch',
		example: 'batch_123456789',
	})
	id: string;

	@ApiProperty({
		description: 'Sequential batch number',
		example: 42,
	})
	batchNumber: number;

	@ApiProperty({
		description: 'Current status of the batch',
		example: 'PENDING',
		enum: ['PENDING', 'READY', 'SUBMITTING', 'SUBMITTED', 'CONFIRMED', 'FAILED'],
	})
	status: string;

	@ApiProperty({
		description: 'Number of authorizations in this batch',
		example: 25,
	})
	memberCount: number;

	@ApiProperty({
		description: 'Timestamp when the batch was created',
		example: '2023-10-31T12:00:00.000Z',
	})
	createdAt: string;

	@ApiProperty({
		description: 'Transaction hash when submitted (if applicable)',
		example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
		required: false,
	})
	transactionHash?: string;
}

export class ErrorResponseDto {
	@ApiProperty({
		description: 'HTTP status code',
		example: 400,
	})
	statusCode: number;

	@ApiProperty({
		description: 'Error message describing what went wrong',
		example: 'Invalid signature',
	})
	message: string;

	@ApiProperty({
		description: 'Detailed error information (for validation errors)',
		example: 'Invalid Ethereum address format for "from" field',
		required: false,
	})
	error?: string;
}
