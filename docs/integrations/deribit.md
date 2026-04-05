# Deribit Integration

Derivatives exchange integration for account data, market data, trading, and wallet operations.

**Required scope:** `DERIBIT`

## Credential Setup

Deribit credentials are stored per-user, encrypted with AES-256-GCM. Store them before using any Deribit endpoints:

```
POST /exchange-credentials/deribit
{
  "clientId": "...",
  "clientSecret": "...",
  "label": "default"
}
```

## Connection

Uses a WebSocket connection to the Deribit API (`wss://www.deribit.com/ws/api/v2` by default). Configurable via `DERIBIT_BASE_URL`.

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
```
All supported currencies.

```
GET /deribit/market/index-price?index=btc_usd
```
Current index price.

```
GET /deribit/market/instruments?currency=BTC&kind=future&expired=false
```
Available instruments. `kind`: `future`, `option`, `spot`, `future_combo`, `option_combo`.

```
GET /deribit/market/book-summary/currency?currency=BTC
```
Order book summary for all instruments in a currency.

```
GET /deribit/market/book-summary/instrument?instrument=BTC-PERPETUAL
```
Order book summary for a specific instrument.

```
GET /deribit/market/delivery-prices?index=btc_usd
```
Historical delivery prices.

```
GET /deribit/market/volatility?currency=BTC&start=1700000000000&end=1700086400000&resolution=3600
```
Volatility index data. `resolution` is in seconds.

---

### Trading

```
GET /deribit/trading/orders/open?currency=BTC
```
Open orders for a currency.

```
GET /deribit/trading/orders/open/instrument?instrument=BTC-PERPETUAL
```
Open orders for a specific instrument.

```
GET /deribit/trading/orders/state?order_id=<id>
```
State of a specific order.

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
Place a buy or sell order.

```
POST /deribit/trading/cancel
{
  "orderId": "<order_id>"
}
```
Cancel an order.

---

### Wallet

```
GET /deribit/wallet/deposits?currency=BTC&count=10&offset=0
```
Deposit history.

```
GET /deribit/wallet/withdrawals?currency=BTC&count=10&offset=0
```
Withdrawal history.

```
GET /deribit/wallet/deposit-address?currency=BTC
```
Current deposit address.

```
POST /deribit/wallet/deposit-address
{
  "currency": "BTC"
}
```
Generate a new deposit address.

```
POST /deribit/wallet/withdraw
{
  "currency": "BTC",
  "address": "bc1q...",
  "amount": 0.01,
  "priority": "mid"
}
```

## Configuration

| Variable | Description |
|---|---|
| `DERIBIT_BASE_URL` | WebSocket URL (default: `wss://www.deribit.com/ws/api/v2`) |

Per-user credentials are managed via the exchange credentials module.
