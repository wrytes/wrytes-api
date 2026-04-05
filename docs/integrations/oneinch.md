# 1inch Integration

DEX swap aggregator. Provides price quotes, swap calldata, and token allowance management via the 1inch Swap API v6.

The 1inch integration is used internally by other services (e.g. wallet swaps). There are no public REST endpoints exposed directly — consumption is via `OneinchService`.

## Service Methods

### Quote

```typescript
oneinchService.quote(chainId, src, dst, srcAmount, params?)
```

Get a price quote for swapping `src` token to `dst` token. Cached for 15 seconds.

| Param | Type | Description |
|---|---|---|
| `chainId` | number | EVM chain ID (e.g. `1` for mainnet) |
| `src` | string | Source token address |
| `dst` | string | Destination token address |
| `srcAmount` | string | Amount in token base units |
| `params` | QuoteParams? | Additional options (see below) |

**QuoteParams:**

| Field | Description |
|---|---|
| `fee` | Partner fee in basis points (0–300) |
| `protocols` | Comma-separated allowed protocols |
| `connectorTokens` | Comma-separated intermediate token addresses |
| `complexityLevel` | Max intermediate tokens (1–3) |
| `mainRouteParts` | Max main route splits (1–50) |
| `parts` | Max route sub-splits (1–100) |

---

### Swap

```typescript
oneinchService.swap(chainId, src, dst, srcAmount, from, params?)
```

Get swap transaction calldata. Extends `QuoteParams` with:

| Field | Description |
|---|---|
| `slippage` | Slippage tolerance in percent (0.1–50, default `1`) |
| `receiver` | Recipient address (defaults to `from`) |
| `disableEstimate` | Skip balance/allowance pre-checks |

---

### Allowance

```typescript
oneinchService.allowance(chainId, tokenAddress, walletAddress)
```

Check the current 1inch router allowance for a token/wallet pair.

---

### Approve Calldata

```typescript
oneinchService.approveCalldata(chainId, tokenAddress, amount?)
```

Get calldata to approve the 1inch router to spend a token. Omit `amount` for unlimited approval.

## Configuration

| Variable | Description |
|---|---|
| `ONEINCH_API_KEY` | 1inch API key |

Base URL: `https://api.1inch.dev/swap/v6.0`
