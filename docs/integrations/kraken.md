# Kraken Integration

Spot exchange integration for balances, market data, orders, deposits, and withdrawals.

**Required scope:** `KRAKEN` (operator / admin only)

> This integration is used internally by Wrytes AG. Regular members do not hold the `KRAKEN` scope. All calls use Wrytes AG's operator account configured via environment variables.

## Configuration

| Variable | Description |
|---|---|
| `KRAKEN_PUBLIC_KEY` | Kraken API public key |
| `KRAKEN_PRIVATE_KEY` | Kraken API private key |
| `KRAKEN_ADDRESS_KEY` | Kraken address key |
| `KRAKEN_CHF_WITHDRAW_KEY` | Key name for Wrytes AG's registered CHF bank account on Kraken |
| `KRAKEN_EUR_WITHDRAW_KEY` | Key name for Wrytes AG's registered EUR bank account on Kraken |

## Endpoints

### Balance

```
GET /kraken/balance
```

Returns account balances for all assets.

---

### Market — Ticker

```
GET /kraken/market/ticker?pair=USDTCHF
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
GET /kraken/deposit/methods?asset=USDT
```

Available deposit methods for an asset.

---

### Deposits — Addresses

```
GET /kraken/deposit/addresses?asset=USDT&method=Tether+USD+%28ERC20%29&new=false
```

Deposit addresses for an asset and method. Set `new=true` to generate a fresh address.

---

### Deposits — Status

```
GET /kraken/deposit/status?asset=USDT&limit=25
```

Recent deposit history for an asset.

---

### Withdrawals — Status

```
GET /kraken/withdraw/status?asset=CHF&limit=25
```

Recent withdrawal history for an asset.

## Off-Ramp Usage

The Kraken integration is used internally by the `OffRampProcessor` at each step:

| Step | Kraken call |
|---|---|
| DETECTED | `KrakenDeposit.getMethods` + `getAddresses` — get ERC-20 deposit address |
| TRANSFERRING → DEPOSITED | `KrakenDeposit.getStatus` — poll until deposit confirmed |
| DEPOSITED → SOLD | `KrakenOrders.placeAndWait` — market sell, wait for fill |
| SOLD → WITHDRAWING | `KrakenWithdraw.withdraw` — initiate fiat withdrawal |
| WITHDRAWING → COMPLETED | `KrakenWithdraw.withdrawStatus` — poll until confirmed |

## Supported Trading Pairs

| Token | CHF | EUR |
|---|---|---|
| USDT | `USDTCHF` | `USDTEUR` |
| USDC | `USDCCHF` | `USDCEUR` |
