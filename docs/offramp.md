# Off-Ramp

The off-ramp system automatically converts incoming crypto on a member's Safe wallet into fiat currency and routes it to their registered bank account.

**Required scope:** `OFFRAMP`

## Concepts

### Route

An **OffRampRoute** ties together:
- A dedicated **Safe wallet** (the deposit address the member shares)
- A **target currency** (CHF or EUR)
- A **bank account** (where fiat is sent)
- A **minimum trigger amount** (transfers below this are ignored)

Creating a route automatically provisions a new Safe wallet with the label `offramp:{routeLabel}`.

### Execution

Each detected incoming deposit triggers an **OffRampExecution** — an audit record that tracks the full lifecycle of that conversion.

## State Machine

```
DETECTED
  → TRANSFERRING    Safe → Kraken ERC-20 transfer submitted
  → DEPOSITED       Kraken confirmed the deposit
  → SELLING         Sell order placed
  → SOLD            Sell order filled, fiat amount known
  → WITHDRAWING     Fiat withdrawal to Wrytes AG bank initiated
  → COMPLETED       Withdrawal confirmed
  → FAILED          Any step failed (see `error` field)
```

## Route Endpoints

### List Routes

```
GET /offramp/routes
X-API-Key: rw_prod_...
```

Returns all routes with their deposit address.

```json
[
  {
    "id": "clx...",
    "label": "usdt-chf",
    "targetCurrency": "CHF",
    "minTriggerAmount": "50",
    "status": "ACTIVE",
    "depositAddress": "0xabcd...",
    "safeWallet": { "address": "0xabcd...", "deployed": false },
    "bankAccount": { "currency": "CHF", "label": "default" }
  }
]
```

---

### Get a Route

```
GET /offramp/routes/:id
X-API-Key: rw_prod_...
```

---

### Create a Route

```
POST /offramp/routes
X-API-Key: rw_prod_...
Content-Type: application/json

{
  "label": "usdt-chf",
  "targetCurrency": "CHF",
  "bankAccountId": "clx...",
  "minTriggerAmount": "50"    // optional, defaults to 0
}
```

**Effect:** Provisions a new Safe wallet (`offramp:usdt-chf` label on Ethereum mainnet) and returns its address as `depositAddress`.

**Constraints:**
- `label` must be unique per member.
- `bankAccount.currency` must match `targetCurrency`.

**Response includes `depositAddress`** — this is the address the member sends crypto to.

---

### Pause / Activate / Archive

```
PATCH /offramp/routes/:id/pause
PATCH /offramp/routes/:id/activate
PATCH /offramp/routes/:id/archive
```

- **Pause** — stops the monitor from triggering new executions. In-flight executions continue.
- **Activate** — re-enables a paused route.
- **Archive** — permanent; cannot be re-activated.

---

### Update Minimum Trigger Amount

```
PATCH /offramp/routes/:id/min-trigger
Content-Type: application/json

{ "amount": "100" }
```

---

## Execution Endpoints

### List Executions

```
GET /offramp/executions?routeId=clx...
X-API-Key: rw_prod_...
```

Returns the latest 50 executions for the member. Filter by `routeId` to scope to one route.

---

### Get an Execution

```
GET /offramp/executions/:id
X-API-Key: rw_prod_...
```

Full execution record including all step references (txHash, Kraken order ID, etc.).

## Supported Tokens

All tokens defined in `tokens.config.ts` are monitored. The route handles whatever arrives at the Safe.

| Token | Direct Kraken deposit | Notes |
|---|---|---|
| USDT | Yes | Tether ERC-20 |
| USDC | Yes | USD Coin ERC-20 |
| WETH | Planned | Requires swap pre-step |
| WBTC | Planned | Requires swap pre-step |
| ZCHF | Planned | Requires swap pre-step |

Deposits of unsupported tokens are detected but the execution will fail with a descriptive error.

## Monitor

The `MonitorService` watches all active route Safe addresses for incoming ERC-20 transfers.

**Development (`MONITOR_MODE=polling`):**  
Checks all active Safes using the Alchemy API every `MONITOR_POLL_INTERVAL_MS` milliseconds (default: 60s).

**Production (`MONITOR_MODE=webhook`):**  
Receives Alchemy `ADDRESS_ACTIVITY` webhook events at:

```
POST /monitor/webhook
```

The `x-alchemy-signature` header is verified using the `ALCHEMY_WEBHOOK_SECRET`. Register each Safe address in the Alchemy webhook dashboard.

## Orchestrator

The `OffRampProcessor` is a BullMQ worker running on the `offramp` queue. Each detected deposit becomes a job that is processed step-by-step through the state machine.

- Jobs are persisted in Redis and **survive restarts**.
- Deposit polling retries every 30 seconds for up to 2 hours.
- Withdrawal polling retries every 60 seconds for up to 1 hour.
- On failure, the execution is marked `FAILED` with the error reason and the member is notified.

## Fiat Withdrawal

Once a sell order fills, the fiat balance on Kraken (CHF or EUR) is withdrawn to **Wrytes AG's registered bank account** (`KRAKEN_CHF_WITHDRAW_KEY` or `KRAKEN_EUR_WITHDRAW_KEY`). A subsequent SEPA transfer to the member's IBAN is handled out-of-band by the operator.
