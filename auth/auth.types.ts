import { Address, Hash, Hex } from 'viem';

export type CreateMessageOptions = {
	address: Address;
	valid?: number;
	expired?: number;
};

export type SignInOptions = {
	message: string;
	signature: string | Hex;
};

export type AuthPayload = {
	address: Address;
	userId?: string;
	username?: string;
};

export type AuthAccessToken = {
	accessToken: string;
};

export type VerifySignatureOptions = {
	message: string;
	signature: Hash;
	expectedAddress: Address;
};
