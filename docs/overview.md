# Wrytes API — Overview

Wrytes API is a NestJS-based REST API that provides a unified backend for crypto portfolio and exchange management. It aggregates on-chain data, CEX integrations, and DeFi services under a single authenticated API.

## Architecture

```
wrytes-api/
├── src/
│   ├── config/              # Config modules (app, db, redis, integrations)
│   ├── core/                # Database (Prisma), health checks
│   ├── common/              # Guards, decorators, encryption, events
│   ├── integrations/        # Alchemy, Wallet, Safe, Kraken, Deribit, 1inch, Telegram, AI
│   └── modules/             # Auth, ExchangeCredentials
├── prisma/                  # Schema, migrations, admin scripts
└── stack.testing.yml        # Docker Compose (Postgres + Redis)
```

## Key Capabilities

| Area | Details |
|---|---|
| Auth | Magic link → API key, scope-based permissions |
| On-chain data | Balances, transfers, token data via Alchemy (multi-chain) |
| Managed wallet | Hot wallet backed by a private key, native + ERC-20 |
| Safe | Gnosis Safe multi-sig address prediction and deployment |
| CEX | Kraken (spot) and Deribit (derivatives) with encrypted credentials |
| DEX | 1inch swap quotes and calldata |
| Notifications | Telegram bot integration |
| AI | Claude/Anthropic integration |

## Tech Stack

- **Runtime:** Node.js, TypeScript 5
- **Framework:** NestJS 10
- **Database:** PostgreSQL 16 + Prisma 6
- **Cache:** Redis 7
- **Auth:** API key (bcrypt) + scope guards
- **Encryption:** AES-256-GCM for exchange credentials
- **Blockchain:** viem, Alchemy SDK, Safe Protocol Kit
- **Logging:** nestjs-pino (structured)
- **Docs:** Swagger at `/api/docs`

## API Key Format

All protected endpoints require the `X-API-Key` header:

```
X-API-Key: rw_prod_{keyId}.{secret}
```

See [authentication.md](./authentication.md) for how to obtain a key.
