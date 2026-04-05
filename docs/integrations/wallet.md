# Wallet Integration

A managed hot wallet backed by a private key stored in the environment. Tracks native ETH and ERC-20 token balances across supported chains.

**Required scope:** `WALLET`

## Configuration

| Variable | Description |
|---|---|
| `WALLET_PRIVATE_KEY` | Private key for the managed wallet (hex, with or without `0x` prefix) |
| `ALCHEMY_API_KEY` | Used for RPC transport |

## Endpoints

### Get Wallet Address

```
GET /wallet/address
```

Returns the public Ethereum address derived from `WALLET_PRIVATE_KEY`.

**Response:**
```json
{
  "address": "0x1234..."
}
```

---

### Get Balances

```
GET /wallet/balance?chainId=1
```

Returns native and ERC-20 token balances. `chainId` is optional — omit to get balances across all supported chains.

**Response:**
```json
{
  "chainId": 1,
  "native": "1000000000000000000",
  "tokens": [
    {
      "symbol": "USDC",
      "address": "0xA0b8...",
      "balance": "5000000"
    }
  ]
}
```

---

### List Tracked Tokens

```
GET /wallet/tokens?chainId=1
```

Returns the list of ERC-20 tokens tracked for the wallet. `chainId` is optional.

## Tracked Tokens (Mainnet)

Tokens are defined in `src/config/tokens.config.ts`:

| Symbol | Address |
|---|---|
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| WBTC | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` |
| ZCHF | `0xB58E61C3098d85632Df34EecfB899A1Ed80921cB` |

## Supported Chains

Currently Ethereum mainnet (chainId `1`). Additional chains (Base, Arbitrum, Gnosis) are prepared in the service but not yet active.
