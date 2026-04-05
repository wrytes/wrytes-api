# Deployment

## Infrastructure

The API depends on two external services:

| Service | Version | Default port |
|---|---|---|
| PostgreSQL | 16 Alpine | 5432 |
| Redis | 7 Alpine | 6379 |

For local development and testing, use the provided Docker Compose file:

```bash
docker compose -f stack.testing.yml up -d
```

## Environment Variables

All config is driven by environment variables. Copy `.env.example` to `.env` and fill in values.

### Required

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `production`, or `test` |
| `PORT` | HTTP port (default `3030`) |
| `API_KEY_SECRET` | Signing secret for API keys (≥ 32 chars) |
| `ENCRYPTION_KEY` | AES-256-GCM key for exchange credentials (≥ 32 chars) |
| `BASE_URL` | Public base URL (e.g. `https://api.wrytes.io`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST` | Redis hostname |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_PASSWORD` | Redis password |

### Optional (per integration)

| Variable | Integration |
|---|---|
| `ALCHEMY_API_KEY` | Alchemy on-chain data |
| `WALLET_PRIVATE_KEY` | Managed hot wallet |
| `ONEINCH_API_KEY` | 1inch DEX aggregator |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `TELEGRAM_WEBHOOK_DOMAIN` | Telegram webhook host |
| `TELEGRAM_WEBHOOK_PATH` | Telegram webhook path (default `/telegram/webhook`) |
| `ANTHROPIC_API_KEY` | Claude AI |
| `LOG_LEVEL` | Pino log level (default `info`) |
| `LOG_PRETTY` | Pretty-print logs (default `true`, set `false` in prod) |
| `THROTTLE_TTL` | Rate limit window in seconds (default `60`) |
| `THROTTLE_LIMIT` | Max requests per window (default `100`) |

## Running in Production

```bash
yarn build
yarn start:prod
```

Set `NODE_ENV=production` and `LOG_PRETTY=false` for structured JSON logging.

## Database Migrations

Run migrations before starting the server:

```bash
yarn prisma migrate deploy
```

This applies all pending migrations non-interactively and is safe to run in CI/CD pipelines.

## Health Check

```
GET /health
```

Returns service health status including database and Redis connectivity. Used for container health probes.

## Swagger

Swagger UI is available at `/api/docs` in all environments. In production, consider restricting access to this path at the load balancer level.

## Rate Limiting

Rate limiting is applied globally and scoped per **user** — all API keys belonging to the same user share one request bucket. Unauthenticated endpoints (e.g. `/auth/verify`) fall back to IP-based limiting.

Configured via `THROTTLE_TTL` (window in seconds) and `THROTTLE_LIMIT` (max requests per window).

## CORS

CORS is enabled for all origins by default. Restrict this in production by updating `main.ts` with an explicit `origin` allowlist.
