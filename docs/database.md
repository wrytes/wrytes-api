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

Relations: `apiKeys`, `magicLinks`, `scopes`, `safeWallets`, `exchangeCredentials`

### ApiKey

| Field | Type | Notes |
|---|---|---|
| `id` | String (CUID) | |
| `userId` | String | FK → User |
| `keyId` | String | Unique, 16 chars |
| `secretHash` | String | bcrypt (10 rounds) |
| `expiresAt` | DateTime? | Null = no expiry |
| `revokedAt` | DateTime? | Null = active |
| `lastUsedAt` | DateTime? | Updated on each request |

### MagicLink

One-time tokens used to bootstrap the API key flow.

| Field | Type | Notes |
|---|---|---|
| `token` | String | Unique, 32 chars |
| `expiresAt` | DateTime | 15 minutes from creation |
| `usedAt` | DateTime? | Null = unused |

### Scope & UserScope

Fine-grained permissions. Absence of a record means no access.

`Scope` holds the canonical list of scope names. `UserScope` is the join table between `User` and `Scope`.

Available scope keys: `USER`, `ADMIN`, `AI`, `ALCHEMY`, `WALLET`, `SAFE`, `KRAKEN`, `DERIBIT`

### SafeWallet

Tracks Gnosis Safe wallet addresses per user per chain.

| Field | Type | Notes |
|---|---|---|
| `address` | String | Unique |
| `chainId` | Int | |
| `label` | String | Default `"primary"` |
| `saltNonce` | String | keccak256(userId:chainId:label) |
| `deployed` | Boolean | Default `false` |
| `deployedAt` | DateTime? | |

Unique constraint: `(userId, chainId, label)`

### ExchangeCredential

Encrypted API credentials for Kraken and Deribit.

| Field | Type | Notes |
|---|---|---|
| `exchange` | Enum | `KRAKEN` or `DERIBIT` |
| `label` | String | Default `"default"` |
| `encryptedData` | String | AES-256-GCM ciphertext |
| `isActive` | Boolean | Default `true` |

Encryption format: `base64(iv).base64(authTag).base64(ciphertext)`

Unique constraint: `(userId, exchange, label)`

### AlchemyCache

Response cache for Alchemy API calls.

| Field | Type | Notes |
|---|---|---|
| `requestType` | String | e.g. `BALANCE`, `TOKEN_BALANCES` |
| `parameters` | String | Serialized query params |
| `response` | JSON | Cached response body |
| `expiresAt` | DateTime | TTL per request type |

Unique constraint: `(requestType, parameters)`. Indexed by `expiresAt` for cleanup.
