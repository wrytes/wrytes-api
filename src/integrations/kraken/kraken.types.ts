export interface KrakenCredentials {
	publicKey: string;
	privateKey: string;
	addressKey?: string;
}

export type BalanceResponse = {
	error: any[];
	result: {
		[currency: string]: string;
	};
};

export type TickerInformation = {
	error: any[];
	result: {
		[k: string]: {
			a: [string, string, string];
			b: [string, string, string];
			c: [string, string, string];
			v: [string, string];
			p: [string, string];
			t: [number, number];
			l: [string, string];
			h: [string, string];
			o: string;
		};
	};
};

export type OpenOrder = {
	refid?: string | null;
	userref?: number | null;
	cl_ord_id?: string | null;
	status: 'pending' | 'open' | 'closed' | 'canceled' | 'expired';
	opentm: number;
	starttm: number;
	expiretm: number;
	descr: {
		pair: string;
		type: 'buy' | 'sell';
		ordertype:
			| 'market'
			| 'limit'
			| 'iceberg'
			| 'stop-loss'
			| 'take-profit'
			| 'stop-loss-limit'
			| 'take-profit-limit'
			| 'trailing-stop'
			| 'trailing-stop-limit'
			| 'settle-position';
		price: string;
		price2: string;
		leverage: string;
		order: string;
		close: string;
	};
	vol: string;
	vol_exec: string;
	cost: string;
	fee: string;
	price: string;
	stopprice: string;
	limitprice: string;
	trigger?: 'last' | 'index';
	margin: boolean;
	misc: string;
	stopped?: boolean;
	touched?: boolean;
	liquidated?: boolean;
	partial?: boolean;
	amended?: boolean;
	sender_sub_id?: string | null;
	oflags: string;
	trades?: string[];
	error?: string[];
};

export type OpenOrdersResponse = {
	error: any[];
	result: {
		open: {
			[orderId: string]: OpenOrder;
		};
	};
};

export type AddOrderRequest = {
	userref?: number;
	cl_ord_id?: string;
	ordertype:
		| 'market'
		| 'limit'
		| 'iceberg'
		| 'stop-loss'
		| 'take-profit'
		| 'stop-loss-limit'
		| 'take-profit-limit'
		| 'trailing-stop'
		| 'trailing-stop-limit'
		| 'settle-position';
	type: 'buy' | 'sell';
	volume: string;
	displayvol?: string;
	pair: string;
	asset_class?: 'tokenized_asset';
	price?: string;
	price2?: string;
	trigger?: 'index' | 'last';
	leverage?: string;
	reduce_only?: boolean;
	stptype?: 'cancel-newest' | 'cancel-oldest' | 'cancel-both';
	oflags?: string;
	timeinforce?: 'GTC' | 'IOC' | 'GTD';
	starttm?: string;
	expiretm?: string;
	'close[ordertype]'?:
		| 'limit'
		| 'iceberg'
		| 'stop-loss'
		| 'take-profit'
		| 'stop-loss-limit'
		| 'take-profit-limit'
		| 'trailing-stop'
		| 'trailing-stop-limit';
	'close[price]'?: string;
	'close[price2]'?: string;
	deadline?: string;
	validate?: boolean;
};

export type AddOrderResponse = {
	error: any[];
	result: {
		descr: {
			order: string;
			close?: string;
		};
		txid: string[];
	};
};

export type CancelOrderRequest = {
	txid?: string | number;
	cl_ord_id?: string;
};

export type CancelOrderResponse = {
	error: any[];
	result: {
		count: number;
		pending?: boolean;
	};
};

export type GetOrderInfoRequest = {
	txid: string;
	trades?: boolean;
	userref?: number;
	consolidate_taker?: boolean;
	rebase_multiplier?: 'rebased' | 'base';
};

export type GetOrderInfoResponse = {
	error: any[];
	result: {
		[orderId: string]: OpenOrder;
	};
};

export type WithdrawRequest = {
	asset: string;
	aclass?: 'currency' | 'tokenized_asset';
	key?: string;
	address?: string;
	amount: string;
	max_fee?: string;
	rebase_multiplier?: 'rebased' | 'base';
};

export type WithdrawResponse = {
	error: any[];
	result: {
		refid: string;
	};
};

export type WithdrawInfoRequest = {
	asset: string;
	key: string;
	amount: string;
};

export type WithdrawInfoResponse = {
	error: any[];
	result: {
		method: string;
		limit: string;
		amount: string;
		fee: string;
	};
};

export type WithdrawStatusRequest = {
	asset?: string;
	aclass?: 'currency' | 'tokenized_asset';
	method?: string;
	start?: string;
	end?: string;
	cursor?: boolean | string;
	limit?: number;
	rebase_multiplier?: 'rebased' | 'base';
};

export type WithdrawalInfo = {
	method: string;
	network: string;
	aclass: string;
	asset: string;
	refid: string;
	txid: string;
	info: string;
	amount: string;
	fee: string;
	time: number;
	status: 'Initial' | 'Pending' | 'Settled' | 'Success' | 'Failure';
	'status-prop'?:
		| 'cancel-pending'
		| 'canceled'
		| 'cancel-denied'
		| 'return'
		| 'onhold';
	key: string;
};

export type WithdrawStatusResponse = {
	error: any[];
	result: WithdrawalInfo[];
};

// ---------------------------------------------------------------------------
// Deposit
// ---------------------------------------------------------------------------

export type DepositMethodsRequest = {
	asset: string;
	aclass?: 'currency' | 'tokenized_asset';
};

export type DepositMethod = {
	method: string;
	limit: string | false;
	fee: string | false;
	'address-setup-fee'?: string;
	'gen-address': boolean;
};

export type DepositMethodsResponse = {
	error: any[];
	result: DepositMethod[];
};

export type DepositAddressesRequest = {
	asset: string;
	method: string;
	aclass?: 'currency' | 'tokenized_asset';
	new?: boolean;
};

export type DepositAddress = {
	address: string;
	expiretm: string;
	new?: boolean;
	memo?: string;
	tag?: string;
};

export type DepositAddressesResponse = {
	error: any[];
	result: DepositAddress[];
};

export type DepositStatusRequest = {
	asset?: string;
	aclass?: 'currency' | 'tokenized_asset';
	method?: string;
	start?: string;
	end?: string;
	cursor?: boolean | string;
	limit?: number;
};

export type DepositInfo = {
	method: string;
	network: string;
	aclass: string;
	asset: string;
	refid: string;
	txid: string;
	info: string;
	amount: string;
	fee: string;
	time: number;
	status: 'Initial' | 'Pending' | 'Settled' | 'Success' | 'Failure';
	'status-prop'?: 'return' | 'onhold';
};

export type DepositStatusResponse = {
	error: any[];
	result: DepositInfo[];
};
