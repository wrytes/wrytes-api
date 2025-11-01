export const AuthorizationProcessorABI = [
	{
		inputs: [],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'validBefore',
				type: 'uint256',
			},
		],
		name: 'AuthorizationExpired',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'validAfter',
				type: 'uint256',
			},
		],
		name: 'AuthorizationNotYetValid',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ECDSAInvalidSignature',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'length',
				type: 'uint256',
			},
		],
		name: 'ECDSAInvalidSignatureLength',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 's',
				type: 'bytes32',
			},
		],
		name: 'ECDSAInvalidSignatureS',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'owner',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				internalType: 'uint256',
				name: 'balance',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
		],
		name: 'InsufficientBalance',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidShortString',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				internalType: 'bytes32',
				name: 'nonce',
				type: 'bytes32',
			},
		],
		name: 'NonceAlreadyUsed',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				internalType: 'enum OperationKind',
				name: 'kind',
				type: 'uint8',
			},
			{
				internalType: 'uint256',
				name: 'allowance',
				type: 'uint256',
			},
		],
		name: 'NotAuthorized',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ReentrancyGuardReentrantCall',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'SafeERC20FailedOperation',
		type: 'error',
	},
	{
		inputs: [],
		name: 'SignatureInvalid',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'string',
				name: 'str',
				type: 'string',
			},
		],
		name: 'StringTooLong',
		type: 'error',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'enum OperationKind',
				name: 'kind',
				type: 'uint8',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
		],
		name: 'AllowanceUsed',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'bytes32',
				name: 'nonce',
				type: 'bytes32',
			},
		],
		name: 'AuthorizationCanceled',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				components: [
					{
						internalType: 'uint256',
						name: 'deposit',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'transfer',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'process',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'claim',
						type: 'uint256',
					},
				],
				indexed: false,
				internalType: 'struct Allowance',
				name: 'allowance',
				type: 'tuple',
			},
		],
		name: 'Authorized',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'to',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'Claim',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'to',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'Deposit',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [],
		name: 'EIP712DomainChanged',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'bytes32',
				name: 'nonce',
				type: 'bytes32',
			},
		],
		name: 'NonceUsed',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'to',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'Process',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'to',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'Transfer',
		type: 'event',
	},
	{
		inputs: [],
		name: 'AUTHORIZATION_TYPEHASH',
		outputs: [
			{
				internalType: 'bytes32',
				name: '',
				type: 'bytes32',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				components: [
					{
						internalType: 'uint256',
						name: 'deposit',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'transfer',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'process',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'claim',
						type: 'uint256',
					},
				],
				internalType: 'struct Allowance',
				name: 'allowance',
				type: 'tuple',
			},
		],
		name: 'authorize',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'enum OperationKind',
						name: 'kind',
						type: 'uint8',
					},
					{
						internalType: 'address',
						name: 'from',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'to',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'nonce',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'validAfter',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'validBefore',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct Authorization',
				name: 'auth',
				type: 'tuple',
			},
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'authorizeAuth',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'from',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'authorized',
		outputs: [
			{
				internalType: 'uint256',
				name: 'deposit',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'transfer',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'process',
				type: 'uint256',
			},
			{
				internalType: 'uint256',
				name: 'claim',
				type: 'uint256',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'owner',
				type: 'address',
			},
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'balanceOf',
		outputs: [
			{
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'enum OperationKind',
						name: 'kind',
						type: 'uint8',
					},
					{
						internalType: 'address',
						name: 'from',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'to',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'nonce',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'validAfter',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'validBefore',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct Authorization[]',
				name: 'auths',
				type: 'tuple[]',
			},
		],
		name: 'batchExecute',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'nonce',
				type: 'bytes32',
			},
		],
		name: 'cancelAuthorization',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'eip712Domain',
		outputs: [
			{
				internalType: 'bytes1',
				name: 'fields',
				type: 'bytes1',
			},
			{
				internalType: 'string',
				name: 'name',
				type: 'string',
			},
			{
				internalType: 'string',
				name: 'version',
				type: 'string',
			},
			{
				internalType: 'uint256',
				name: 'chainId',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'verifyingContract',
				type: 'address',
			},
			{
				internalType: 'bytes32',
				name: 'salt',
				type: 'bytes32',
			},
			{
				internalType: 'uint256[]',
				name: 'extensions',
				type: 'uint256[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'enum OperationKind',
						name: 'kind',
						type: 'uint8',
					},
					{
						internalType: 'address',
						name: 'from',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'to',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'nonce',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'validAfter',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'validBefore',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct Authorization',
				name: 'auth',
				type: 'tuple',
			},
		],
		name: 'executeWithAuthorization',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
			{
				internalType: 'bytes32',
				name: '',
				type: 'bytes32',
			},
		],
		name: 'nonces',
		outputs: [
			{
				internalType: 'bool',
				name: '',
				type: 'bool',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'enum OperationKind',
						name: 'kind',
						type: 'uint8',
					},
					{
						internalType: 'address',
						name: 'from',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'to',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'nonce',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'validAfter',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'validBefore',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct Authorization',
				name: 'auth',
				type: 'tuple',
			},
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'verifyAllowance',
		outputs: [
			{
				internalType: 'uint256',
				name: '',
				type: 'uint256',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'enum OperationKind',
						name: 'kind',
						type: 'uint8',
					},
					{
						internalType: 'address',
						name: 'from',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'to',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'nonce',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'validAfter',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'validBefore',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct Authorization',
				name: 'auth',
				type: 'tuple',
			},
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		name: 'verifyAuthorization',
		outputs: [],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'enum OperationKind',
						name: 'kind',
						type: 'uint8',
					},
					{
						internalType: 'address',
						name: 'from',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'to',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'nonce',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'validAfter',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'validBefore',
						type: 'uint256',
					},
					{
						internalType: 'bytes',
						name: 'signature',
						type: 'bytes',
					},
				],
				internalType: 'struct Authorization',
				name: 'auth',
				type: 'tuple',
			},
		],
		name: 'verifySignature',
		outputs: [
			{
				internalType: 'address',
				name: 'signer',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
] as const;
