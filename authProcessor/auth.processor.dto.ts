import { IsEnum, IsString, Matches } from 'class-validator';
import { AuthorizationInput, AuthorizationOperationKind } from './auth.processor.types';

export class AuthorizationInputDto implements AuthorizationInput {
	@IsEnum(AuthorizationOperationKind)
	kind: AuthorizationOperationKind;

	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format' })
	from: string;

	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format' })
	to: string;

	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid token address format' })
	token: string;

	@IsString()
	@Matches(/^\d+$/, { message: 'Amount must be a valid number string' })
	amount: string;

	@IsString()
	@Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid nonce format' })
	nonce: string;

	@IsString()
	@Matches(/^\d+$/, { message: 'ValidAfter must be a valid timestamp string' })
	validAfter: string;

	@IsString()
	@Matches(/^\d+$/, { message: 'ValidBefore must be a valid timestamp string' })
	validBefore: string;

	@IsString()
	@Matches(/^0x[a-fA-F0-9]+$/, { message: 'Invalid signature format' })
	signature: string;
}
