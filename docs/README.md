# Wrytes API — Documentation

## Contents

| File | Description |
|---|---|
| [overview.md](./overview.md) | Architecture, tech stack, high-level capabilities |
| [getting-started.md](./getting-started.md) | Local setup, environment config, first API key |
| [authentication.md](./authentication.md) | Magic link flow, API keys, key management |
| [scopes.md](./scopes.md) | Permission model, available scopes |
| [user-profile.md](./user-profile.md) | User profile (KYC/KYB) management and verification |
| [bank-accounts.md](./bank-accounts.md) | Member bank account management (encrypted IBAN) |
| [offramp.md](./offramp.md) | Off-ramp routes, execution lifecycle, monitor |
| [database.md](./database.md) | Prisma schema, models, migrations |
| [deployment.md](./deployment.md) | Environment variables, Docker, production config |

### Integrations (Operator / Internal)

| File | Description |
|---|---|
| [integrations/safe.md](./integrations/safe.md) | Gnosis Safe address prediction, deployment, and transfers |
| [integrations/kraken.md](./integrations/kraken.md) | Kraken spot exchange (Wrytes AG operator account) |
| [integrations/deribit.md](./integrations/deribit.md) | Deribit derivatives exchange (Wrytes AG operator account) |
| [integrations/alchemy.md](./integrations/alchemy.md) | On-chain balances and transaction history |
| [integrations/wallet.md](./integrations/wallet.md) | Managed hot wallet (native + ERC-20) |
| [integrations/oneinch.md](./integrations/oneinch.md) | 1inch DEX swap aggregator |

## Live API Reference

Swagger UI is available at `/api/docs` when the server is running.
