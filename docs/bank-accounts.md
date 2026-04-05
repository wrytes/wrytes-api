# Bank Accounts

Members register their IBAN bank accounts as fiat payout destinations for off-ramp routes.

**Required scope:** `USER`

IBANs are encrypted at rest with AES-256-GCM. List responses return a masked IBAN (`CH**...1234`). The full plaintext IBAN is only used internally during off-ramp execution.

## Endpoints

### List Bank Accounts

```
GET /bank-accounts
X-API-Key: rw_prod_...
```

Returns all bank accounts for the authenticated member. IBANs are masked.

```json
[
  {
    "id": "clx...",
    "userId": "clx...",
    "iban": "CH05****3456",
    "bic": "POFICHBE",
    "holderName": "Jane Doe",
    "currency": "CHF",
    "label": "default",
    "isDefault": true,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

### Add a Bank Account

```
POST /bank-accounts
X-API-Key: rw_prod_...
Content-Type: application/json

{
  "iban": "CH5604835012345678009",
  "bic": "POFICHBE",
  "holderName": "Jane Doe",
  "currency": "CHF",
  "label": "default",        // optional, defaults to "default"
  "isDefault": true          // optional
}
```

The `label` must be unique per member. Setting `isDefault: true` clears any existing default.

**Currencies:** `CHF`, `EUR`

---

### Update a Bank Account

```
PUT /bank-accounts/:id
X-API-Key: rw_prod_...
Content-Type: application/json

{
  "bic": "POFICHBEXXX",
  "holderName": "Jane Doe",
  "label": "main",
  "isDefault": false
}
```

Only the provided fields are updated. The IBAN cannot be changed — delete and re-add instead.

---

### Delete a Bank Account

```
DELETE /bank-accounts/:id
X-API-Key: rw_prod_...
```

Returns `204 No Content`. Fails with `409 Conflict` if the account is linked to an active off-ramp route.

---

### Set as Default

```
POST /bank-accounts/:id/default
X-API-Key: rw_prod_...
```

Clears the existing default and sets this account as the new default.

## Notes

- A bank account must be registered on Kraken by the Wrytes AG operator before it can be used for fiat withdrawals. This is a one-time manual step per member.
- The `currency` field must match the `targetCurrency` of any off-ramp route that references this account.
