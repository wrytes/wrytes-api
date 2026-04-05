# Kraken Integration

Spot exchange integration for balances, market data, orders, deposits, and withdrawals.

**Required scope:** `KRAKEN`

## Credential Setup

Kraken credentials are stored per-user, encrypted with AES-256-GCM. Store them via the [Exchange Credentials](../exchange-credentials.md) endpoints before using any Kraken endpoints.

```
POST /exchange-credentials/kraken
{
  "publicKey": "...",
  "privateKey": "...",
  "addressKey": "...",   // optional, for withdrawal address verification
  "label": "default"
}
```

## Endpoints

### Balance

```
GET /kraken/balance
```

Returns account balances for all assets.

---

### Market — Ticker

```
GET /kraken/market/ticker?pair=USDT/CHF
```

Full ticker info for a trading pair.

---

### Market — Price

```
GET /kraken/market/price?symbol=XXBTZUSD
```

Last-trade price for a symbol.

---

### Orders — Open

```
GET /kraken/orders/open
```

All currently open orders.

---

### Orders — Info

```
GET /kraken/orders/info?txid=<txid>&trades=true
```

Details for a specific order by transaction ID.

---

### Deposits — Methods

```
GET /kraken/deposit/methods?asset=XBT
```

Available deposit methods for an asset.

---

### Deposits — Addresses

```
GET /kraken/deposit/addresses?asset=XBT&method=Bitcoin&new=false
```

Deposit addresses for an asset and method. Set `new=true` to generate a fresh address.

---

### Deposits — Status

```
GET /kraken/deposit/status?asset=XBT&limit=25
```

Recent deposit history for an asset.

---

### Withdrawals — Status

```
GET /kraken/withdraw/status?asset=XBT&limit=25
```

Recent withdrawal history for an asset.

## Configuration

Kraken credentials are managed per-user via the exchange credentials module. There are also optional global API keys in `.env` for server-level operations (if needed):

| Variable | Description |
|---|---|
| `KRAKEN_PUBLIC_KEY` | Global Kraken public API key |
| `KRAKEN_PRIVATE_KEY` | Global Kraken private API key |
| `KRAKEN_ADDRESS_KEY` | Global Kraken address key (withdrawal verification) |
