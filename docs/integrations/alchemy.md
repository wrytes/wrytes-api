# Alchemy Integration

Provides on-chain data for ETH balances, token balances, and transaction history across multiple EVM chains.

**Required scope:** `ALCHEMY`

## Chain Parameter

The `:chain` path parameter is the Alchemy network name, e.g.:
- `eth-mainnet`
- `base-mainnet`
- `arb-mainnet`
- `polygon-mainnet`
- `opt-mainnet`

## Endpoints

### Native Balance

```
GET /chains/:chain/account/:address/balance
```

Returns the ETH (or native token) balance in wei.

---

### Transactions

```
GET /chains/:chain/account/:address/transactions
  ?direction=inbound|outbound
  &limit=25
  &pageKey=<cursor>
```

External asset transfers (EOA-to-EOA).

---

### Internal Transactions

```
GET /chains/:chain/account/:address/internal-transactions
  ?direction=inbound|outbound
  &limit=25
  &pageKey=<cursor>
```

Internal transfers triggered by contract calls.

---

### All ERC-20 Token Balances

```
GET /chains/:chain/account/:address/token-balances
  ?pageKey=<cursor>
```

Returns all ERC-20 balances for an address.

---

### Single Token Balance

```
GET /chains/:chain/account/:address/token/:contract/balance
```

Returns the balance of a specific ERC-20 token.

---

### All ERC-20 Token Transfers

```
GET /chains/:chain/account/:address/token-transfers
  ?direction=inbound|outbound
  &limit=25
  &pageKey=<cursor>
```

---

### Specific Token Transfers

```
GET /chains/:chain/account/:address/token/:contract/transfers
  ?direction=inbound|outbound
  &limit=25
  &pageKey=<cursor>
```

## Caching

Responses are cached in PostgreSQL (`AlchemyCache` table) with per-request-type TTLs. Cache entries are keyed by `(requestType, parameters)`.

### Admin — Cache Stats

```
GET /cache/stats
```

Requires `ADMIN` scope.

### Admin — Cache Cleanup

```
POST /cache/cleanup
```

Removes expired cache entries. Requires `ADMIN` scope.

## Configuration

| Variable | Description |
|---|---|
| `ALCHEMY_API_KEY` | Alchemy API key |
