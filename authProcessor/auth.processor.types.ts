import { mainnet } from 'viem/chains';

export enum AuthorizationOperationKind {
	TRANSFER = 0,
	DEPOSIT = 1,
	PROCESS = 2,
	CLAIM = 3,
}

// EIP-712 type
export type AuthorizationType = {
	kind: AuthorizationOperationKind;
	from: string;
	to: string;
	token: string;
	amount: string;
	nonce: string;
	validAfter: string;
	validBefore: string;
};

// EIP-712 signature
export const AuthorizationSignature = {
	Authorization: [
		{ name: 'kind', type: 'uint8' },
		{ name: 'from', type: 'address' },
		{ name: 'to', type: 'address' },
		{ name: 'token', type: 'address' },
		{ name: 'amount', type: 'uint256' },
		{ name: 'nonce', type: 'bytes32' },
		{ name: 'validAfter', type: 'uint256' },
		{ name: 'validBefore', type: 'uint256' },
	],
};

export const AuthorizationDomain = {
	name: 'AuthorizationProcessor',
	version: '1',
	chainId: mainnet.id,
	verifyingContract: '0x3874161854D0D5f13B4De2cB5061d9cff547466E' as `0x${string}`,
};
