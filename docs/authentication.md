# Authentication

## Overview

Each user registers their own account via the **Telegram bot**. Once registered, they can generate API keys to grant approved applications access to their data and actions through the Wrytes API.

There are no passwords — authentication is based entirely on API keys issued through the Telegram bot.

## Flow

```
1. User interacts with the Telegram bot → account is created automatically
2. User requests a magic link via the bot
3. User GETs /auth/verify?token=<token>  →  receives an API key
4. API key is used in the X-API-Key header by any application the user authorizes
```

## Magic Link

A magic link is a one-time token that expires after **15 minutes** and can only be used once.

```
GET /auth/verify?token=<32-char-token>
```

**Response:**

```json
{
	"key": "rw_prod_<keyId>.<secret>"
}
```

No authentication is required on this endpoint.

## API Key Format

```
rw_prod_{keyId}.{secret}
```

- `keyId` — 16-character identifier (stored in DB)
- `secret` — 32-character secret (bcrypt-hashed in DB, never stored in plaintext)

Send in every request as a header:

```
X-API-Key: rw_prod_abc123def456ghi7.xyz789...
```

## Key Management

All key management endpoints require an active API key.

### List keys

```
GET /auth/keys
```

Returns active (non-expired, non-revoked) keys with their `keyId`, `createdAt`, `expiresAt`, and `lastUsedAt`.

### List scopes

```
GET /auth/scopes
```

Returns the scope keys assigned to the authenticated user, e.g. `["USER", "ALCHEMY", "WALLET"]`.

### Revoke a key

```
POST /auth/revoke
Content-Type: application/json

{ "keyId": "<keyId>" }
```

Soft-deletes the key by setting `revokedAt`. Only the owner can revoke their own keys.

## How Validation Works

On every request the `ApiKeyGuard`:

1. Parses the `X-API-Key` header for `keyId` and `secret`
2. Looks up the key record by `keyId`
3. Checks it is not expired or revoked
4. Verifies the secret against the stored bcrypt hash
5. Attaches `user`, `userScopes`, and `apiKey` to the request context
6. Updates `lastUsedAt`

## Users

Users are identified by their Telegram ID. A user record is created automatically the first time they interact with the Telegram bot — no manual registration step required. An admin notification is emitted on first account creation.
