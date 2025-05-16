import { Address, Hex } from 'viem';

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
};

export type AuthAccessToken = {
	accessToken: string;
};
