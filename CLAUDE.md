# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development Server:**
- `yarn dev` - Start development server with hot reload (preferred for development)
- `yarn start:dev` - Alternative development command
- `yarn start:debug` - Development with debug mode
- `yarn start:prod` - Production server

**Build & Test:**
- `yarn build` - Build NestJS application to `/dist`
- `yarn lint` - Run ESLint with auto-fix
- `yarn test` - Run Jest test suite
- `yarn test:watch` - Run tests in watch mode
- `yarn test:cov` - Run tests with coverage
- `yarn test:e2e` - Run end-to-end tests

**Package Management:**
- `yarn npm:build` - Build exportable npm package using tsup
- `yarn npm:publish` - Publish package to npm registry

**Database Management:**
- `yarn db:generate` - Generate Prisma client from schema
- `yarn db:migrate` - Create and apply migration
- `yarn db:migrate:deploy` - Deploy migrations to production
- `yarn db:push` - Push schema changes directly to database
- `yarn db:studio` - Open Prisma Studio for database management
- `yarn db:reset` - Reset database with fresh migrations

## Architecture Overview

**Framework:** NestJS API with modular architecture, Swagger documentation at root path (`/`)

**Core Modules:**
- **AuthModule** - JWT authentication with Ethereum wallet signature verification
- **WalletModule** - Ethereum wallet operations using Viem library  
- **DockerModule** - Container build and deployment operations via Dockerode
- **DatabaseModule** - PostgreSQL with Prisma ORM and automatic Docker fallback
- **TelegramService** - Bot integration for notifications and group management
- **StorjService** - S3-compatible storage operations

**Blockchain Integration:**
- Uses Viem for Ethereum mainnet operations
- Alchemy RPC provider for blockchain data
- Scheduled polling service monitors block height changes
- CoinGecko API integration for price data

**Build System:**
- NestJS build: TypeScript compilation to `/dist` for API server
- Package export: tsup build to `/exports/dist` for npm distribution
- Exports only type definitions from modules via `/exports/index.ts`

## Configuration

**Environment Setup:**
1. Copy `.env.example` to `.env.local` 
2. Required variables:
   - `BACKEND_WALLET_SEED` - Mnemonic for wallet operations
   - `ALCHEMY_RPC_KEY` - Blockchain RPC access
   - `TELEGRAM_BOT_TOKEN` - Bot API access
   - `STORJ_*` - S3 storage credentials
   - `COINGECKO_API_KEY` - Price data API
   - `DATABASE_URL` - Primary PostgreSQL connection string
   - `DATABASE_FALLBACK_URL` - Optional fallback database connection

**Key Config Files:**
- `api.config.ts` - Main configuration with blockchain and external service setup
- `database/schema.prisma` - Database schema definition and configuration
- `tsconfig.json` - NestJS TypeScript config (relaxed strictness)
- `exports/tsconfig.json` - Stricter config for npm package exports
- `tsup.config.ts` - Package build configuration

## Code Organization

**File Structure:**
- Root files: `api.main.ts` (entry), `api.module.ts` (root module), `api.service.ts` (polling service)
- `/auth` - Authentication with JWT and wallet signature verification
- `/wallet` - Ethereum wallet service using Viem
- `/docker` - Container operations (build, deploy services and controllers)
- `/database` - PostgreSQL database service with Prisma ORM and health monitoring
- `/telegram` - Bot service with message templates and group management
- `/storj` - S3 storage operations
- `/exports` - Package export definitions (types only)

**Important Patterns:**
- Services use NestJS dependency injection
- Scheduled tasks via `@Interval` and `@Cron` decorators
- Wallet operations use Viem's account abstraction
- Docker operations use Dockerode for container management
- Database operations use Prisma with automatic Docker fallback
- Authentication via custom JWT guard with wallet signature verification

## Testing & Development

**Test Configuration:**
- Jest configured for TypeScript
- Test files: `*.spec.ts` pattern
- Root directory: `src` (but tests are co-located with source)
- Coverage output: `/coverage`

**TypeScript Configuration:**
- Uses decorators and metadata emission for NestJS
- Relaxed strictness for main app, strict mode for exports
- Base URL resolution enabled for clean imports

## Database Module

**Architecture:** PostgreSQL with Prisma ORM and automatic Docker fallback
**Health Endpoints:** `/health/database/*` for monitoring database status
**Migration Commands:** `yarn db:migrate` for development, `yarn db:migrate:deploy` for production

**Fallback Strategy:**
1. Primary `DATABASE_URL` connection
2. Fallback `DATABASE_FALLBACK_URL` if configured  
3. Automatic PostgreSQL Docker container deployment

**Health Monitoring:**
- `/health/database` - Overall database health status
- `/health/database/status` - Connection status and source
- `/health/database/connections` - Active connection count
- `/health/database/migrations` - Migration status and history
- `/health/database/performance` - Query performance metrics
- `/health/database/docker` - Docker container status (if using fallback)

**Key Features:**
- Type-safe database operations with auto-generated Prisma types
- Automatic retry logic with exponential backoff
- Connection pooling and performance monitoring
- Docker container lifecycle management
- Comprehensive health check system