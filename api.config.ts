import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { http, createPublicClient, Chain } from 'viem';
import { mainnet } from 'viem/chains';

// Verify environment
if (process.env.ALCHEMY_RPC_KEY === undefined) throw new Error('ALCHEMY_RPC_KEY not available');
if (process.env.COINGECKO_API_KEY === undefined) throw new Error('COINGECKO_API_KEY not available');

// Config type
export type ConfigType = {
	app: string;
	indexer: string;
	alchemyRpcKey: string;
	coingeckoApiKey: string;
	chain: Chain;
};

// Database configuration type
export type DatabaseConfigType = {
	primary: string | undefined;
	fallback: string | undefined;
	dockerContainer: {
		name: string;
		image: string;
		port: string;
		database: string;
		user: string;
		password: string;
	};
	connection: {
		retryAttempts: number;
		retryDelay: number;
		timeout: number;
		poolSize: number;
		dockerRetryAttempts: number;
		dockerRetryDelay: number;
	};
};

// Create config
export const CONFIG: ConfigType = {
	app: process.env.CONFIG_APP_URL || 'http://localhost:3000',
	indexer: process.env.CONFIG_INDEXER_URL || 'http://localhost:42069',
	coingeckoApiKey: process.env.COINGECKO_API_KEY,
	chain: mainnet,
	alchemyRpcKey: process.env.ALCHEMY_RPC_KEY,
};

// Start up message
console.log(`Starting API with this config:`);
console.log(CONFIG);

// VIEM CONFIG
export const VIEM_CHAIN = CONFIG.chain;
export const VIEM_CONFIG = createPublicClient({
	chain: VIEM_CHAIN,
	transport: http(`https://eth-mainnet.g.alchemy.com/v2/${CONFIG.alchemyRpcKey}`),
	batch: {
		multicall: {
			wait: 200,
		},
	},
});

// PONDER CLIENT REQUEST
export const PONDER_CLIENT = new ApolloClient({
	uri: CONFIG.indexer,
	cache: new InMemoryCache(),
});

// COINGECKO CLIENT
export const COINGECKO_CLIENT = (query: string) => {
	const hasParams = query.includes('?');
	const uri: string = `https://api.coingecko.com${query}`;
	return fetch(`${uri}${hasParams ? '&' : '?'}${CONFIG.coingeckoApiKey}`);
};

// DATABASE CONFIG
export const DATABASE_CONFIG: DatabaseConfigType = {
	primary: process.env.DATABASE_URL,
	fallback: process.env.DATABASE_FALLBACK_URL,
	dockerContainer: {
		name: 'wrytlabs-postgres-dev',
		image: 'postgres:15-alpine',
		port: '5433',
		database: 'wrytlabs_dev',
		user: 'wrytlabs',
		password: 'dev_password',
	},
	connection: {
		retryAttempts: 3,
		retryDelay: 5000,
		timeout: 30000,
		poolSize: 10,
		dockerRetryAttempts: 12,
		dockerRetryDelay: 10000,
	},
};
