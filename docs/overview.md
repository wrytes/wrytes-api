# Wrytes API — Overview

Wrytes API is a NestJS-based REST API powering **Wrytes AG**, a Finance-as-a-Service (FaaS) crypto off-ramp operator. The system automatically converts crypto deposited into member Safe wallets into fiat currency and routes it to the member's registered bank account.

## Business Model

Wrytes AG operates as a **Finance as a Service** provider:

- **Members** send crypto to their dedicated Safe wallet deposit address.
- **Wrytes AG** monitors deposits, executes the conversion via Kraken, and sends fiat to the member's IBAN.
- All exchange accounts (Kraken, Deribit) are owned and operated by Wrytes AG — members never connect their own exchange credentials.
- This is the prestep toward a Genossenschaft (cooperative) structure where shareholders and members are the same people.

## Architecture

```
wrytes-api/
├── src/
│   ├── config/              # Config modules (app, db, redis, integrations)
│   ├── core/
│   │   ├── database/        # Prisma service
│   │   ├── health/          # Health check endpoint
│   │   └── offramp/         # BullMQ orchestrator, monitor service
│   ├── common/              # Guards, decorators, encryption, events
│   ├── integrations/        # Alchemy, Wallet, Safe, Kraken, Deribit, 1inch, Telegram, AI
│   └── modules/             # Auth, UserProfile, BankAccounts, OffRampRoutes, OffRampExecutions
├── prisma/                  # Schema, migrations
└── stack.testing.yml        # Docker Compose (Postgres + Redis)
```

## Off-Ramp Flow

```
Member sends crypto
       ↓
  Dedicated Safe wallet  (deposit address, per route)
       ↓
  MonitorService detects incoming ERC-20 transfer
       ↓
  BullMQ Orchestrator executes state machine:
    DETECTED → TRANSFERRING → DEPOSITED → SELLING → SOLD → WITHDRAWING → COMPLETED
       ↓
  Safe → Kraken (ERC-20 transfer)
       ↓
  Kraken: sell crypto → CHF / EUR
       ↓
  Kraken: withdraw fiat to Wrytes AG bank
       ↓
  Member notified via Telegram
```

## Key Capabilities

| Area | Details |
|---|---|
| Auth | Magic link → API key, scope-based permissions |
| Member profile | KYC/KYB fields, operator-verified |
| Bank accounts | Encrypted IBAN storage, fiat payout destination |
| Off-ramp routes | Per-member, per-currency routes with dedicated Safe addresses |
| Safe wallets | Gnosis Safe multi-sig, deterministic address per route |
| On-chain monitoring | Alchemy polling (dev) or webhooks (prod) |
| Async execution | BullMQ over Redis — jobs survive restarts |
| CEX (operator) | Kraken spot, Deribit derivatives |
| DEX | 1inch swap quotes and calldata |
| Notifications | Telegram bot integration |
| AI | Claude/Anthropic integration |

## Supported Tokens

Defined in `src/config/tokens.config.ts`:

| Symbol | Name | Ethereum Mainnet |
|---|---|---|
| USDC | USD Coin | `0xA0b8...eB48` |
| USDT | Tether USD | `0xdAC1...ec7` |
| WETH | Wrapped Ether | `0xC02a...C2` |
| WBTC | Wrapped Bitcoin | `0x2260...99` |
| ZCHF | Frankencoin | `0xB58E...cB` |

> USDT and USDC are supported for direct Kraken deposit. WETH, WBTC, and ZCHF require a swap pre-step (planned).

## Tech Stack

- **Runtime:** Node.js, TypeScript 5
- **Framework:** NestJS 10
- **Database:** PostgreSQL 16 + Prisma 6
- **Cache / Queues:** Redis 7 + BullMQ
- **Auth:** API key (bcrypt) + scope guards
- **Encryption:** AES-256-GCM (IBAN, sensitive data at rest)
- **Blockchain:** viem, Alchemy SDK, Safe Protocol Kit v7
- **Logging:** nestjs-pino (structured JSON)
- **Docs:** Swagger at `/api/docs`

## API Key Format

All protected endpoints require the `X-API-Key` header:

```
X-API-Key: rw_prod_{keyId}.{secret}
```

See [authentication.md](./authentication.md) for how to obtain a key.
