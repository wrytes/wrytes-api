# Scopes

Access to integrations is controlled by a scope-based permission system. Each user is granted zero or more scopes; each endpoint declares which scopes are required.

## Available Scopes

| Scope | Grants access to |
|---|---|
| `USER` | Exchange credential management (`/exchange-credentials`) |
| `ADMIN` | Admin-only endpoints (cache stats, cleanup); bypasses all scope checks |
| `AI` | AI/Claude endpoints |
| `ALCHEMY` | On-chain data via Alchemy (`/chains/...`) |
| `WALLET` | Managed hot wallet (`/wallet/...`) |
| `SAFE` | Gnosis Safe wallets (`/safe/...`) |
| `KRAKEN` | Kraken exchange (`/kraken/...`) |
| `DERIBIT` | Deribit exchange (`/deribit/...`) |

## ADMIN bypass

Users with the `ADMIN` scope pass all scope checks automatically — they can access any endpoint regardless of what other scopes they hold.

## How Scopes Are Enforced

1. The `ApiKeyGuard` loads the user's scopes from DB and attaches them to the request.
2. The `ScopesGuard` reads the `@RequireScopes(...)` decorator on each route.
3. If the user is missing any required scope, the request is rejected with `403 Forbidden` and a message listing the missing scopes.

## Checking Your Scopes

```
GET /auth/scopes
X-API-Key: rw_prod_...
```

Returns:
```json
["USER", "ALCHEMY", "WALLET"]
```

## Managing Scopes (Admin)

Scopes are managed via admin scripts in `prisma/scripts/` or directly through the Prisma DB. There is no public API endpoint for granting/revoking scopes — this is intentional.

Relevant service methods (internal use):
- `authService.grantScope(userId, scopeKey)` — upserts a scope
- `authService.revokeScope(userId, scopeKey)` — deletes a scope
