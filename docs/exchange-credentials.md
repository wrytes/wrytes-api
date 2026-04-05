# Exchange Credentials

Manages encrypted API credentials for Kraken and Deribit on a per-user basis.

**Required scope:** `USER`

Credentials are encrypted with AES-256-GCM before storage. The encryption key is set via `ENCRYPTION_KEY` in `.env`. Plaintext credentials are never persisted.

**Encryption format:** `base64(iv).base64(authTag).base64(ciphertext)`

## Endpoints

### List Configured Exchanges

```
GET /exchange-credentials
X-API-Key: rw_prod_...
```

Returns active credential entries (no sensitive data):

```json
[
  {
    "id": "clx...",
    "exchange": "KRAKEN",
    "label": "default",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Save Kraken Credentials

```
POST /exchange-credentials/kraken
X-API-Key: rw_prod_...
Content-Type: application/json

{
  "publicKey": "...",
  "privateKey": "...",
  "addressKey": "...",   // optional
  "label": "default"    // optional, defaults to "default"
}
```

Creates or replaces credentials for the given `label`. Upserts on `(userId, exchange, label)`.

---

### Save Deribit Credentials

```
POST /exchange-credentials/deribit
X-API-Key: rw_prod_...
Content-Type: application/json

{
  "clientId": "...",
  "clientSecret": "...",
  "label": "default"    // optional, defaults to "default"
}
```

---

### Delete Credentials

```
DELETE /exchange-credentials/:exchange/:label
X-API-Key: rw_prod_...
```

`:exchange` is `kraken` or `deribit`. `:label` identifies which credential set to delete.

## Labels

Labels allow multiple credential sets per exchange per user (e.g. `"main"`, `"trading"`, `"readonly"`). Most users will only have a single `"default"` label per exchange.
