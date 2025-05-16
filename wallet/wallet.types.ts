import { Address, Hash } from 'viem';

export type VerifySignatureOptions = {
	message: string;
	signature: Hash;
	expectedAddress: Address;
};
