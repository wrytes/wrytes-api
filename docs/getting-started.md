# Getting Started

## Prerequisites

- Node.js 20+
- Docker (for Postgres + Redis)
- An Alchemy API key (for on-chain features)

## 1. Clone and install

```bash
git clone <repo>
cd wrytes-api
yarn install
```

## 2. Start infrastructure

```bash
docker compose -f stack.testing.yml up -d
```

This starts:
- PostgreSQL 16 on `localhost:5432` (db: `wrytes`, user/pass: `postgres`)
- Redis 7 on `localhost:6379` (password: `redis`)

## 3. Configure environment

```bash
cp .env.example .env
```

Minimum required variables:

| Variable | Description |
|---|---|
| `API_KEY_SECRET` | Secret for API key signing (≥ 32 chars) |
| `ENCRYPTION_KEY` | AES-256-GCM key for exchange credentials (≥ 32 chars) |
| `DATABASE_URL` | Postgres connection string |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection |

Optional (enables specific integrations):

| Variable | Integration |
|---|---|
| `ALCHEMY_API_KEY` | Alchemy (on-chain data) |
| `WALLET_PRIVATE_KEY` | Managed hot wallet |
| `ONEINCH_API_KEY` | 1inch swaps |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `ANTHROPIC_API_KEY` | AI features |

See [`.env.example`](../.env.example) for the full list.

## 4. Run migrations

```bash
yarn prisma migrate deploy
```

## 5. Start the server

```bash
# development (watch mode)
yarn start:dev

# production
yarn build && yarn start:prod
```

The API is available at `http://localhost:3030` by default.

Swagger UI: `http://localhost:3030/api/docs`

## 6. Get an API key

API keys are issued via magic links. You need a user record first — typically created via the Telegram bot or admin scripts in `prisma/scripts/`.

Once you have a magic link token:

```bash
GET /auth/verify?token=<token>
# Returns: { key: "rw_prod_<keyId>.<secret>" }
```

Use that key in all subsequent requests:

```
X-API-Key: rw_prod_<keyId>.<secret>
```

See [authentication.md](./authentication.md) for the full auth flow.
