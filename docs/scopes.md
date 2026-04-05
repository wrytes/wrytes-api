# Scopes

Access to features is controlled by a scope-based permission system. Each user is granted zero or more scopes; each endpoint declares which scopes are required.

## Available Scopes

| Scope | Grants access to |
|---|---|
| `USER` | Own profile, bank accounts, general member endpoints |
| `OFFRAMP` | Off-ramp routes and execution history |
| `SAFE` | Safe wallet management (`/safe/...`) |
| `ALCHEMY` | On-chain data via Alchemy (`/chains/...`) |
| `WALLET` | Managed hot wallet (`/wallet/...`) |
| `KRAKEN` | Kraken exchange endpoints — **operator / admin only** |
| `DERIBIT` | Deribit exchange endpoints — **operator / admin only** |
| `AI` | AI/Claude endpoints |
| `ADMIN` | Bypasses all scope checks; full system access |

## Scope Notes

**`KRAKEN` and `DERIBIT`** scopes remain enforced on their endpoints, but Wrytes AG operates these accounts centrally — regular members do not hold these scopes. Only the operator / admin account uses them directly.

**`ADMIN`** bypasses all scope checks automatically. Admin users can access any endpoint regardless of what other scopes they hold.

## Typical Member Scopes

A newly onboarded member would receive:

```
USER, OFFRAMP, SAFE
```

## How Scopes Are Enforced

1. The `ApiKeyGuard` loads the user's scopes from DB and attaches them to the request.
2. The `ScopesGuard` reads the `@RequireScopes(...)` decorator on each route.
3. If the user is missing any required scope, the request is rejected with `403 Forbidden` listing the missing scopes.

## Checking Your Scopes

```
GET /auth/scopes
X-API-Key: rw_prod_...
```

Returns:
```json
["USER", "OFFRAMP", "SAFE"]
```

## Managing Scopes (Admin)

Scopes are managed via admin scripts or directly through service methods. There is no public API endpoint for granting/revoking scopes.

Relevant service methods (internal):
- `authService.grantScope(userId, scopeKey)` — upserts a scope
- `authService.revokeScope(userId, scopeKey)` — deletes a scope
