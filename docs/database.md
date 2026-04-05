# Database

Wrytes API uses **PostgreSQL 16** with **Prisma 6** as the ORM.

## Connection

Configured via `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wrytes
```

## Migrations

```bash
# Apply all pending migrations (CI / production)
yarn prisma migrate deploy

# Create a new migration during development
yarn prisma migrate dev --name <migration-name>

# Open Prisma Studio (DB browser)
yarn prisma studio
```

## Schema

### User

The core identity record, linked to a Telegram account.

| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | Primary key |
| `telegramId` | BigInt | Unique |
| `telegramHandle` | String? | Optional |
| `notificationsEnabled` | Boolean | Default `true` |

Relations: `apiKeys`, `magicLinks`, `scopes`, `safeWallets`, `profile`, `bankAccounts`, `offRampRoutes`

---

### UserProfile

KYC/KYB data for a member. 1:1 with `User`.

| Field | Type | Notes |
|---|---|---|
| `userId` | String | Unique FK → User |
| `firstName` | String | |
| `lastName` | String | |
| `businessName` | String? | For KYB |
| `dateOfBirth` | DateTime? | |
| `street` | String? | |
| `city` | String? | |
| `postalCode` | String? | |
| `country` | String? | ISO 3166-1 alpha-2 (e.g. `"CH"`) |
| `isVerified` | Boolean | Default `false`, set by operator |
| `verifiedAt` | DateTime? | Set when `isVerified` flipped to `true` |

---

### BankAccount

Member's fiat payout destination. IBAN is encrypted at rest.

| Field | Type | Notes |
|---|---|---|
| `userId` | String | FK → User |
| `iban` | String | AES-256-GCM encrypted |
| `bic` | String | Stored in uppercase |
| `holderName` | String | |
| `currency` | FiatCurrency | `CHF` or `EUR` |
| `label` | String | Default `"default"` |
| `isDefault` | Boolean | Default `false` |

Unique constraint: `(userId, label)`

---

### SafeWallet

Tracks Gnosis Safe wallet addresses per user per chain.

| Field | Type | Notes |
|---|---|---|
| `address` | String | Unique |
| `chainId` | Int | |
| `label` | String | Default `"primary"`. Off-ramp Safes use `offramp:{routeLabel}` |
| `saltNonce` | String | `keccak256(userId:chainId:label)` → BigInt |
| `deployed` | Boolean | Default `false` |
| `deployedAt` | DateTime? | |

Unique constraint: `(userId, chainId, label)`

---

### OffRampRoute

Links a member's Safe (deposit address) to a bank account and target currency.

| Field | Type | Notes |
|---|---|---|
| `userId` | String | FK → User |
| `label` | String | Human-readable name |
| `safeWalletId` | String | Unique FK → SafeWallet |
| `targetCurrency` | FiatCurrency | `CHF` or `EUR` |
| `bankAccountId` | String | FK → BankAccount |
| `minTriggerAmount` | Decimal | Executions below this are skipped |
| `status` | OffRampRouteStatus | `ACTIVE`, `PAUSED`, `ARCHIVED` |

Unique constraint: `(userId, label)`

---

### OffRampExecution

Audit trail for each off-ramp execution. One record per detected deposit.

| Field | Type | Notes |
|---|---|---|
| `routeId` | String | FK → OffRampRoute |
| `userId` | String | Denormalised for query convenience |
| `status` | OffRampExecutionStatus | See state machine below |
| `tokenSymbol` | String | e.g. `"USDT"` |
| `tokenAmount` | Decimal | Amount received at Safe |
| `onChainTxHash` | String? | Incoming transfer tx hash |
| `krakenDepositRef` | String? | Kraken deposit refid |
| `krakenOrderId` | String? | Kraken sell order description |
| `fiatAmount` | Decimal? | Resulting fiat amount after sell |
| `krakenWithdrawalId` | String? | Kraken fiat withdrawal refid |
| `error` | String? | Set if status is `FAILED` |

**Execution status machine:**

```
DETECTED → TRANSFERRING → DEPOSITED → SELLING → SOLD → WITHDRAWING → COMPLETED
                                                                     ↘ FAILED (any step)
```

---

### ApiKey

| Field | Type | Notes |
|---|---|---|
| `keyId` | String | Unique, 16 chars |
| `secretHash` | String | bcrypt (10 rounds) |
| `expiresAt` | DateTime? | Null = no expiry |
| `revokedAt` | DateTime? | Null = active |
| `lastUsedAt` | DateTime? | Updated on each request |

---

### MagicLink

One-time tokens used to bootstrap the API key flow.

| Field | Type | Notes |
|---|---|---|
| `token` | String | Unique, 32 chars |
| `expiresAt` | DateTime | 15 minutes from creation |
| `usedAt` | DateTime? | Null = unused |

---

### Scope & UserScope

Fine-grained permissions. Absence of a record means no access.

Available scope keys: `USER`, `ADMIN`, `AI`, `ALCHEMY`, `WALLET`, `SAFE`, `KRAKEN`, `DERIBIT`, `OFFRAMP`

---

### AlchemyCache

Response cache for Alchemy API calls.

| Field | Type | Notes |
|---|---|---|
| `requestType` | String | e.g. `BALANCE`, `TOKEN_BALANCES` |
| `parameters` | String | Serialised query params |
| `response` | JSON | Cached response body |
| `expiresAt` | DateTime | TTL per request type |

Unique constraint: `(requestType, parameters)`. Indexed by `expiresAt` for cleanup.

## Enums

```prisma
enum FiatCurrency   { CHF EUR }
enum OffRampRouteStatus { ACTIVE PAUSED ARCHIVED }
enum OffRampExecutionStatus { DETECTED TRANSFERRING DEPOSITED SELLING SOLD WITHDRAWING COMPLETED FAILED }
```
