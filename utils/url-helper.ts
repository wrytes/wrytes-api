import { CONFIG } from 'api.config';

export function ExplorerAddressUrl(address: string): string {
	return CONFIG.chain.blockExplorers.default.url + `/address/${address}`;
}

export function ExplorerTxUrl(tx: string): string {
	return CONFIG.chain.blockExplorers.default.url + `/tx/${tx}`;
}

export function AppUrl(path: string): string {
	return `${CONFIG.app}${path}`;
}
