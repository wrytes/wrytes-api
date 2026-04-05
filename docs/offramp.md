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

Creating a route automatically provisions a new Safe wallet keyed to `offramp:{bankAccountId}:{currency}` on Ethereum mainnet. The Safe address is stable — it is derived from the bank account and currency, not the route label, so renaming a route does not affect the deposit address.

### Execution

Each detected incoming deposit triggers an **OffRampExecution** — an audit record that tracks the full lifecycle of that conversion.

`depositTxHash` is the on-chain hash of the incoming ERC-20 transfer to the Safe (used for deduplication). `onChainTxHash` is the hash of the Safe's outbound transaction (transfer to Kraken, or a future multi-action swap+transfer).

## State Machine

```
DETECTED
  → TRANSFERRING          Safe → Kraken ERC-20 transfer submitted
  → DEPOSITED             Kraken confirmed the deposit
  → SELLING               Sell order placed
  → SOLD                  Sell order filled, fiat amount known
  → WITHDRAWING           Fiat withdrawal to Wrytes AG bank initiated
  → PENDING_BANK_TRANSFER Kraken withdrawal confirmed, awaiting manual transfer to member
  → SETTLED               Operator confirmed bank transfer to member
  → FAILED                Any step failed (see `error` field)
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
    "label": "salary",
    "targetCurrency": "CHF",
    "minTriggerAmount": "50",
    "status": "ACTIVE",
    "depositAddress": "0xabcd...",
    "safeWallet": { "address": "0xabcd...", "deployed": true },
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
  "label": "salary",
  "targetCurrency": "CHF",
  "bankAccountId": "clx...",
  "minTriggerAmount": "50"    // optional, defaults to 0
}
```

**Effect:** Provisions a new Safe wallet on Ethereum mainnet and returns its address as `depositAddress`. The Safe is not deployed on-chain until the first transaction — use `scripts/deploy-safe.ts` to deploy before the first deposit.

**Constraints:**
- `label` must be unique per member.
- `bankAccount.currency` must match `targetCurrency`.
- `minTriggerAmount`, if provided, must be ≥ Kraken's minimum deposit for all directly-supported assets (USDC, USDT). The same check applies when updating via `PATCH /offramp/routes/:id`.

---

### Update a Route

```
PATCH /offramp/routes/:id
X-API-Key: rw_prod_...
Content-Type: application/json

{
  "label": "new-label",         // optional
  "minTriggerAmount": "100"     // optional
}
```

Updating the label does not affect the deposit address.

---

### Pause / Activate

```
PATCH /offramp/routes/:id/pause
PATCH /offramp/routes/:id/activate
```

- **Pause** — stops the monitor from triggering new executions. In-flight executions continue.
- **Activate** — re-enables a paused route.

Valid transitions: `ACTIVE → PAUSED`, `PAUSED → ACTIVE`.

---

### Delete a Route *(admin only)*

```
DELETE /offramp/routes/:id
X-API-Key: rw_admin_...
```

Hard-deletes the route record. The Safe wallet and any existing executions are not removed.

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

Full execution record including all step references (`depositTxHash`, `onChainTxHash`, Kraken refs, etc.).

---

### List Pending Bank Transfers *(admin only)*

```
GET /offramp/executions/pending-transfer
X-API-Key: rw_admin_...
```

Returns all executions in `PENDING_BANK_TRANSFER` status, including the member's bank account details, ordered by oldest first. Use this as the review queue before initiating manual PostFinance transfers.

---

### Settle an Execution *(admin only)*

```
PATCH /offramp/executions/:id/settle
X-API-Key: rw_admin_...
Content-Type: application/json

{ "bankTransferRef": "PF-2026-04-05-001" }   // optional
```

Marks the execution as `SETTLED` and notifies the member. `bankTransferRef` should be the PostFinance payment reference for traceability.

---

### Delete an Execution *(admin only)*

```
DELETE /offramp/executions/:id
X-API-Key: rw_admin_...
```

Hard-deletes the execution record.

---

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

The `MonitorService` watches all active route Safe addresses for incoming ERC-20 transfers. It always fetches fresh data from Alchemy (bypassing the response cache) to avoid missing deposits.

**Development (`MONITOR_MODE=polling`):**  
Checks all active Safes using the Alchemy API every `MONITOR_POLL_INTERVAL_MS` milliseconds (default: 60s).

**Production (`MONITOR_MODE=webhook`):**  
Receives Alchemy `ADDRESS_ACTIVITY` webhook events at:

```
POST /monitor/webhook
```

The `x-alchemy-signature` header is verified using `ALCHEMY_WEBHOOK_SECRET`. Register each Safe address in the Alchemy webhook dashboard.

## Orchestrator

The `OffRampProcessor` is a BullMQ worker running on the `offramp` queue. Each detected deposit becomes a job that is processed step-by-step through the state machine.

- Jobs are persisted in Redis and **survive restarts**.
- Deposit polling retries every 30 seconds for up to 2 hours.
- Withdrawal polling retries every 60 seconds for up to 1 hour.
- On failure, the execution is marked `FAILED`, the member is notified, and an admin alert is sent.

## Notifications

| Event | User | Admin |
|---|---|---|
| Deposit detected | Crypto received | — |
| Kraken deposit confirmed | Arrived at exchange | — |
| Sell order filled | Swapped to fiat | — |
| Kraken withdrawal confirmed | Payment pending | Payment pending review (with bank details) |
| Execution settled | Payment sent | — |
| Execution failed | Off-ramp failed | Off-ramp execution failed |

## Fiat Withdrawal Flow

1. Kraken withdraws fiat to **Wrytes AG's registered bank account** (`KRAKEN_CHF_WITHDRAW_KEY` or `KRAKEN_EUR_WITHDRAW_KEY`)
2. Execution moves to `PENDING_BANK_TRANSFER` and admin is notified via Telegram
3. Operator reviews `GET /offramp/executions/pending-transfer` and initiates a manual PostFinance transfer to the member's IBAN
4. Operator calls `PATCH /offramp/executions/:id/settle` with the transfer reference — member is notified

## Before the First Deposit

The Safe wallet is predicted deterministically but not deployed on-chain until its first transaction. Funds sent to an undeployed Safe are safe (CREATE2 guarantees the address), but the processor will fail at the transfer step if the contract doesn't exist yet.

Deploy the Safe before sending funds:

```
yarn script:deploy-safe <safeWalletId>
```
