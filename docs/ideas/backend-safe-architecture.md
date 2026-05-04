# Idea: Backend Safe as Operator Wallet

## Problem

The current setup has the backend EOA (`WALLET_PRIVATE_KEY`) directly owning and executing transactions for each user Safe. Every offramp operation is a separate on-chain transaction signed by the EOA — one gas payment per user per step.

## Idea

Introduce a **backend Safe** controlled by the backend EOA, and make that Safe the owner of all user Safes instead.

```
Backend EOA
    └── Backend Safe (operator)
            ├── User Safe A
            ├── User Safe B
            └── User Safe C
```

## How It Would Work

- At user Safe deployment, set the **backend Safe address** as the sole owner (instead of the raw EOA)
- The backend Safe signs for user Safes via **EIP-1271** contract signatures — fully supported by the Safe Protocol Kit
- The backend EOA signs once on the backend Safe, which authorises actions on any number of child Safes

## Key Benefits

### Batching across user Safes
Use **MultiSend** on the backend Safe to batch operations across multiple user Safes in a single EOA signature and gas payment. For example, 10 offramp transfers in one transaction instead of 10.

### Single signing surface
The EOA only ever interacts with the backend Safe. All user Safe authorisations flow through it — easier key rotation, easier access control.

### Audit trail
Every action across all user Safes is visible as a transaction on the backend Safe, giving a clean operator-level audit log.

### Future: spending limits / modules
The backend Safe can be extended with Safe modules (e.g. spending limit module, allowance module) to automate recurring operations without requiring a full Safe signature each time.

## What Would Change in Code

- `safe.service.ts` — `initSdkForAddress` would use the backend Safe as the contract signer (EIP-1271) rather than the raw private key
- `ensureDeployed` — pass the backend Safe address as owner at deployment instead of `this.wallet.address`
- `executeManyRaw` / `executeTransfer` — build the user Safe tx, sign with backend Safe, then execute via backend Safe

The processor and strategy logic would be unchanged — the batching opportunity lives entirely in `SafeService`.

## When to Do This

Worth implementing once transaction volume justifies it. For low volume it adds complexity without meaningful savings.
