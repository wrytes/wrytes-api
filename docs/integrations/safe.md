# Safe Integration

Gnosis Safe multi-sig wallet management. Supports deterministic address prediction, on-chain deployment, and ERC-20 transfers.

**Required scope:** `SAFE`

## How It Works

Each Safe address is predicted deterministically from:
- The managed hot wallet address (as the single owner)
- A salt nonce derived from `keccak256(userId:chainId:label)`

The address is stable before deployment — members can receive funds at a predicted address immediately.

**Safe configuration:**
- Version: 1.4.1
- Owner: managed hot wallet (threshold: 1)
- Uses L1 singleton for chainId 1 (Ethereum mainnet)

## Labels

Safe labels have two namespaces:

| Namespace | Example | Purpose |
|---|---|---|
| General | `primary` | Member's own Safe wallets |
| Off-ramp | `offramp:{bankAccountId}:{currency}` | Automatically provisioned per off-ramp route |

Off-ramp Safe labels are keyed to the bank account ID and currency, not the route label. This means the deposit address remains stable even if the route is renamed.

Off-ramp Safes are created by the `OffRampRoutesService` when a route is created. Members do not need to create them manually.

## Endpoints

### Get or Predict Safe Address

```
GET /safe/wallet?chainId=1&label=primary
X-API-Key: rw_prod_...
```

Returns the Safe wallet for the authenticated user. If no record exists yet, the address is predicted and saved. `label` defaults to `"primary"`.

**Response:**
```json
{
  "address": "0xabcd...",
  "chainId": 1,
  "label": "primary",
  "deployed": false,
  "deployedAt": null
}
```

---

### List Safe Wallets

```
GET /safe/wallets?chainId=1
X-API-Key: rw_prod_...
```

Returns all Safe wallets for the authenticated user. Omit `chainId` to get all chains.

---

### Delete a Safe Wallet *(admin only)*

```
DELETE /safe/wallet/:id?force=true
X-API-Key: rw_admin_...
```

Deletes the Safe wallet DB record. Only undeployed wallets can be deleted by default. Pass `?force=true` to delete a deployed wallet (the on-chain contract is unaffected — only the DB record is removed).

## Internal: Deployment

Deployment is triggered internally via `SafeService.ensureDeployed()`. The operator wallet sends the factory deployment transaction and waits for receipt. `deployed` is set to `true` on confirmation.

## Internal: ERC-20 Transfer

The `SafeService.executeTransfer(safeWalletId, tokenAddress, toAddress, amount)` method is used by the off-ramp orchestrator to move tokens out of a Safe.

It:
1. Encodes an ERC-20 `transfer(to, amount)` call
2. Creates a Safe transaction via protocol-kit
3. Signs with the operator key (`WALLET_PRIVATE_KEY`)
4. Executes on-chain and waits for receipt
5. Returns the transaction hash

## Configuration

Requires `WALLET_PRIVATE_KEY` (operator account, Safe owner + gas payer) and `ALCHEMY_API_KEY` (RPC provider).
