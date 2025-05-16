import { ApolloClient, InMemoryCache } from '@apollo/client/core';
import { http, createPublicClient, Chain } from 'viem';
import { mainnet, polygon } from 'viem/chains';

// Verify environment
if (process.env.RPC_URL_MAINNET === undefined) throw new Error('RPC_URL_MAINNET not available');
if (process.env.RPC_URL_POLYGON === undefined) throw new Error('RPC_URL_POLYGON not available');
if (process.env.COINGECKO_API_KEY === undefined) throw new Error('COINGECKO_API_KEY not available');

// Config type
export type ConfigType = {
	app: string;
	indexer: string;
	coingeckoApiKey: string;
	chain: Chain;
	network: {
		mainnet: string;
		polygon: string;
	};
};

// Create config
export const CONFIG: ConfigType = {
	app: process.env.CONFIG_APP_URL || 'http://localhost:3000',
	indexer: process.env.CONFIG_INDEXER_URL || 'http://localhost:42069',
	coingeckoApiKey: process.env.COINGECKO_API_KEY,
	chain: process.env.CONFIG_CHAIN === 'mainnet' ? mainnet : polygon, // @dev: default polygon
	network: {
		mainnet: process.env.RPC_URL_MAINNET,
		polygon: process.env.RPC_URL_POLYGON,
	},
};

// Start up message
console.log(`Starting API with this config:`);
console.log(CONFIG);

// VIEM CONFIG
export const VIEM_CHAIN = CONFIG.chain;
export const VIEM_CONFIG = createPublicClient({
	chain: VIEM_CHAIN,
	transport: http(process.env.CONFIG_CHAIN === 'mainnet' ? CONFIG.network.mainnet : CONFIG.network.polygon),
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
