# Deribit Integration

Derivatives exchange integration for account data, market data, trading, and wallet operations.

**Required scope:** `DERIBIT` (operator / admin only)

> This integration uses Wrytes AG's operator account configured via environment variables. Regular members do not hold the `DERIBIT` scope.

## Configuration

| Variable | Description |
|---|---|
| `DERIBIT_CLIENT_ID` | Deribit client ID |
| `DERIBIT_CLIENT_SECRET` | Deribit client secret |
| `DERIBIT_BASE_URL` | WebSocket URL (default: `wss://www.deribit.com/ws/api/v2`) |

## Connection

Uses a single persistent WebSocket connection to the Deribit API, lazily initialised on first use. The connection is closed cleanly on module shutdown.

## Endpoints

### Account

```
GET /deribit/account/summaries
```
Account summaries for all sub-accounts.

```
GET /deribit/account/summary?currency=BTC
```
Account summary for a specific currency (BTC, ETH, USDC, etc.).

```
GET /deribit/account/position?instrument=BTC-PERPETUAL
```
Current position for a specific instrument.

```
GET /deribit/account/portfolio-margins?currency=BTC
```
Portfolio margin data for a currency.

```
GET /deribit/account/transaction-log?currency=BTC&start=1700000000000&end=1700086400000&count=50
```
Transaction log. `start` and `end` are Unix timestamps in milliseconds.

---

### Market

```
GET /deribit/market/currencies
GET /deribit/market/index-price?index=btc_usd
GET /deribit/market/instruments?currency=BTC&kind=future&expired=false
GET /deribit/market/book-summary/currency?currency=BTC
GET /deribit/market/book-summary/instrument?instrument=BTC-PERPETUAL
GET /deribit/market/delivery-prices?index=btc_usd
GET /deribit/market/volatility?currency=BTC&start=1700000000000&end=1700086400000&resolution=3600
```

`kind`: `future`, `option`, `spot`, `future_combo`, `option_combo`. `resolution` is in seconds.

---

### Trading

```
GET /deribit/trading/orders/open?currency=BTC
GET /deribit/trading/orders/open/instrument?instrument=BTC-PERPETUAL
GET /deribit/trading/orders/state?order_id=<id>
```

```
POST /deribit/trading/buy
POST /deribit/trading/sell
{
  "instrument": "BTC-PERPETUAL",
  "amount": 10,
  "type": "limit",
  "price": 45000,
  "label": "my-order"
}
```

```
POST /deribit/trading/cancel
{ "orderId": "<order_id>" }
```

---

### Wallet

```
GET /deribit/wallet/deposits?currency=BTC&count=10&offset=0
GET /deribit/wallet/withdrawals?currency=BTC&count=10&offset=0
GET /deribit/wallet/deposit-address?currency=BTC
POST /deribit/wallet/deposit-address   { "currency": "BTC" }
POST /deribit/wallet/withdraw
{
  "currency": "BTC",
  "address": "bc1q...",
  "amount": 0.01,
  "priority": "mid"
}
```
