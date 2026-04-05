# Safe Integration

Gnosis Safe multi-sig wallet management. Supports deterministic address prediction and on-chain deployment.

**Required scope:** `SAFE`

## How It Works

Each user gets a Safe wallet address predicted deterministically from:
- The managed hot wallet address (as the single owner)
- A salt nonce derived from `keccak256(userId:chainId:label)`

The address is the same every time for the same user/chain/label combination, even before deployment.

**Safe configuration:**
- Version: 1.4.1
- Owners: managed hot wallet (threshold: 1)
- Uses L1 singleton for chainId 1 (Ethereum mainnet)

## Endpoints

### Get or Predict Safe Address

```
GET /safe/wallet?chainId=1&label=primary
```

Returns the Safe wallet address for the authenticated user. If no record exists yet, the address is predicted and saved. `label` defaults to `"primary"`.

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
```

Returns all Safe wallets for the authenticated user. `chainId` is optional — omit to get wallets across all chains.

**Response:**
```json
[
  {
    "address": "0xabcd...",
    "chainId": 1,
    "label": "primary",
    "deployed": true,
    "deployedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Deployment

Deployment is handled internally via `safe.service.ensureDeployed()`. The managed hot wallet sends the deployment transaction and waits for receipt. Once confirmed, `deployed` is set to `true` and `deployedAt` is recorded.

There is no public endpoint to trigger deployment — it is called internally as needed.

## Configuration

Requires the managed wallet (`WALLET_PRIVATE_KEY` + `ALCHEMY_API_KEY`) to be configured, as it is used as the Safe owner and pays for deployment gas.
