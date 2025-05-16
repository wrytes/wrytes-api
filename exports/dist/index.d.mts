import { Address, Hex, Hash } from 'viem';

type CreateMessageOptions = {
    address: Address;
    valid?: number;
    expired?: number;
};
type SignInOptions = {
    message: string;
    signature: string | Hex;
};
type AuthPayload = {
    address: Address;
};
type AuthAccessToken = {
    accessToken: string;
};

type CreateDockerfileOptions = {
    image: string;
    git: string;
    branch?: string;
    env?: object;
    build?: string;
    run?: string;
    port?: number;
};
type CreateImageOptions = CreateDockerfileOptions & {
    tag: string;
};

declare class SubscriptionGroups {
    constructor();
    groups: string[];
}

type TelegramState = {
    startup: number;
};
type TelegramGroupState = {
    apiVersion: string;
    createdAt: number;
    updatedAt: number;
    groups: string[];
    ignore: string[];
    subscription: {
        [key: string]: SubscriptionGroups;
    };
};

type VerifySignatureOptions = {
    message: string;
    signature: Hash;
    expectedAddress: Address;
};

export type { AuthAccessToken, AuthPayload, CreateDockerfileOptions, CreateImageOptions, CreateMessageOptions, SignInOptions, TelegramGroupState, TelegramState, VerifySignatureOptions };
