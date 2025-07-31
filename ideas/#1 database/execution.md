# Database Module Execution Plan

## Overview
This execution plan provides step-by-step instructions for implementing the database module with automatic Docker fallback functionality.

## Prerequisites
- Node.js and Yarn installed
- Docker running locally
- Environment variables configured per `.env.example`

## Phase 1: Foundation Setup (Day 1-2)

### Task 1.1: Install Dependencies
```bash
# Core database dependencies
yarn add prisma @prisma/client

# Development dependencies
yarn add -D prisma-dbml-generator @types/pg
```

### Task 1.2: Create Database Module Structure
```bash
# Create directory structure
mkdir -p database/health database/types database/migrations

# Create core files
touch database/database.module.ts
touch database/database.service.ts
touch database/database.config.ts
touch database/health/database-health.controller.ts
touch database/health/database-health.service.ts
touch database/types/database.types.ts
touch database/schema.prisma
```

### Task 1.3: Initialize Prisma
```bash
npx prisma init --datasource-provider postgresql
```

### Task 1.4: Create Base Schema
**File: `database/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

generator dbml {
  provider = "prisma-dbml-generator"
  output   = "./dbml"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Health check table
model SystemHealth {
  id        String   @id @default(cuid())
  status    String
  timestamp DateTime @default(now())
  metadata  Json?

  @@map("system_health")
}
```

## Phase 2: Configuration Integration (Day 2-3)

### Task 2.1: Extend API Configuration
**File: `api.config.ts` - Add to existing config:**
```typescript
// Add to existing imports
import { PrismaClient } from '@prisma/client';

// Add database configuration
export const DATABASE_CONFIG = {
  primary: process.env.DATABASE_URL,
  fallback: process.env.DATABASE_FALLBACK_URL,
  dockerContainer: {
    name: 'wrytlabs-postgres-dev',
    image: 'postgres:15-alpine',
    port: '5433',
    database: 'wrytlabs_dev',
    user: 'wrytlabs',
    password: 'dev_password'
  },
  connection: {
    retryAttempts: 3,
    retryDelay: 5000,
    timeout: 30000,
    poolSize: 10
  }
} as const;
```

### Task 2.2: Update Environment Variables
**File: `.env.example` - Add database variables:**
```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/wrytlabs?schema=public"
DATABASE_FALLBACK_URL="postgresql://user:password@backup-host:5432/wrytlabs?schema=public"

# Docker Database Fallback
POSTGRES_USER=wrytlabs
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=wrytlabs_dev
```

## Phase 3: Docker Integration (Day 3-4)

### Task 3.1: Extend Docker Module
**File: `docker/docker.database.service.ts`**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { DATABASE_CONFIG } from '../api.config';

@Injectable()
export class DockerDatabaseService {
  private readonly logger = new Logger(this.constructor.name);
  
  constructor(private readonly dockerClient: DockerClient) {}

  async deployPostgresContainer(): Promise<boolean> {
    // Implementation for PostgreSQL container deployment
  }

  async isContainerHealthy(): Promise<boolean> {
    // Health check implementation
  }

  async stopContainer(): Promise<void> {
    // Container cleanup
  }
}
```

### Task 3.2: Create Database Container Types
**File: `docker/docker.database.types.ts`**
```typescript
export interface PostgresContainerConfig {
  name: string;
  image: string;
  port: string;
  database: string;
  user: string;
  password: string;
}

export interface ContainerHealth {
  status: 'starting' | 'healthy' | 'unhealthy';
  uptime: number;
  lastCheck: Date;
}
```

### Task 3.3: Update Docker Module
**File: `docker/docker.module.ts` - Add database service:**
```typescript
import { DockerDatabaseService } from './docker.database.service';

@Module({
  providers: [
    DockerClient, 
    DockerBuildService, 
    DockerDeployService,
    DockerDatabaseService  // Add this
  ],
  controllers: [DockerBuildController, DockerDeployController],
  exports: [DockerDatabaseService]  // Export for database module
})
export class DockerModule {}
```

## Phase 4: Database Service Implementation (Day 4-6)

### Task 4.1: Create Database Types
**File: `database/types/database.types.ts`**
```typescript
export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connection: {
    primary: boolean;
    fallback: boolean | null;
    docker: boolean | null;
  };
  performance: {
    responseTime: number;
    activeConnections: number;
    poolUtilization: number;
  };
  lastChecked: Date;
}

export interface ConnectionStatus {
  connected: boolean;
  source: 'primary' | 'fallback' | 'docker';
  connectionString: string;
  error?: string;
}
```

### Task 4.2: Implement Database Service
**File: `database/database.service.ts`**
```typescript
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DockerDatabaseService } from '../docker/docker.database.service';
import { DATABASE_CONFIG } from '../api.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(this.constructor.name);
  private prisma: PrismaClient;
  private connectionStatus: ConnectionStatus;
  private dockerFallbackActive = false;

  constructor(private readonly dockerDatabase: DockerDatabaseService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    // Implementation for connection logic with fallback
  }

  async healthCheck(): Promise<DatabaseHealth> {
    // Health check implementation
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}
```

### Task 4.3: Create Database Module
**File: `database/database.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseHealthController } from './health/database-health.controller';
import { DatabaseHealthService } from './health/database-health.service';
import { DockerModule } from '../docker/docker.module';

@Module({
  imports: [DockerModule],
  providers: [DatabaseService, DatabaseHealthService],
  controllers: [DatabaseHealthController],
  exports: [DatabaseService]
})
export class DatabaseModule {}
```

## Phase 5: Health Check Implementation (Day 6-7)

### Task 5.1: Create Health Service
**File: `database/health/database-health.service.ts`**
```typescript
@Injectable()
export class DatabaseHealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getOverallHealth(): Promise<DatabaseHealth> {
    // Comprehensive health check
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    // Connection status details
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // Performance data collection
  }
}
```

### Task 5.2: Create Health Controller
**File: `database/health/database-health.controller.ts`**
```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Database Health')
@Controller('health')
export class DatabaseHealthController {
  constructor(private readonly healthService: DatabaseHealthService) {}

  @Get('database')
  @ApiOperation({ summary: 'Get database health status' })
  async getDatabaseHealth(): Promise<DatabaseHealth> {
    return this.healthService.getOverallHealth();
  }

  @Get('database/status')
  @ApiOperation({ summary: 'Get connection status' })
  async getConnectionStatus(): Promise<ConnectionStatus> {
    return this.healthService.getConnectionStatus();
  }

  // Additional endpoints...
}
```

## Phase 6: Integration & Testing (Day 7-8)

### Task 6.1: Update Main App Module
**File: `api.module.ts` - Add DatabaseModule:**
```typescript
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot(), 
    ScheduleModule.forRoot(), 
    AuthModule, 
    WalletModule, 
    DockerModule,
    DatabaseModule  // Add this
  ],
  providers: [Storj, TelegramService, ApiService],
})
export class AppModule {}
```

### Task 6.2: Create Migration Scripts
**File: `package.json` - Add database scripts:**
```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "db:seed": "ts-node database/seed.ts"
  }
}
```

### Task 6.3: Create Basic Tests
**File: `database/database.service.spec.ts`**
```typescript
describe('DatabaseService', () => {
  let service: DatabaseService;
  let dockerService: DockerDatabaseService;

  beforeEach(async () => {
    // Test setup
  });

  it('should connect to primary database', async () => {
    // Test primary connection
  });

  it('should fallback to Docker when primary fails', async () => {
    // Test Docker fallback
  });
});
```

## Phase 7: Documentation & Deployment (Day 8-9)

### Task 7.1: Update CLAUDE.md
Add database module information to the existing CLAUDE.md file:
```markdown
## Database Module

**Architecture**: PostgreSQL with Prisma ORM and automatic Docker fallback
**Health Endpoints**: `/health/database/*` for monitoring
**Migration Commands**: `yarn db:migrate` for development, `yarn db:migrate:deploy` for production

**Fallback Strategy**:
1. Primary `DATABASE_URL` connection
2. Fallback `DATABASE_FALLBACK_URL` if configured
3. Automatic PostgreSQL Docker container deployment
```

### Task 7.2: Create Development Guide
**File: `database/README.md`**
```markdown
# Database Module

## Quick Start
1. Copy `.env.example` to `.env.local`
2. Run `yarn db:generate` to generate Prisma client
3. Run `yarn dev` - database will auto-deploy via Docker if needed

## Commands
- `yarn db:studio` - Open Prisma Studio
- `yarn db:migrate` - Create and apply migration
- `yarn db:reset` - Reset database with fresh migrations
```

## Execution Checklist

### Pre-Implementation
- [ ] Docker is running locally
- [ ] Environment variables are configured
- [ ] All team members have necessary permissions

### Phase 1 (Foundation)
- [ ] Dependencies installed
- [ ] Directory structure created
- [ ] Prisma initialized
- [ ] Base schema created

### Phase 2 (Configuration)
- [ ] API config extended
- [ ] Environment variables updated
- [ ] Configuration tested

### Phase 3 (Docker Integration)
- [ ] Docker database service created
- [ ] Container types defined
- [ ] Docker module updated
- [ ] Container deployment tested

### Phase 4 (Database Service)
- [ ] Database types defined
- [ ] Database service implemented
- [ ] Connection fallback logic tested
- [ ] Database module created

### Phase 5 (Health Checks)
- [ ] Health service implemented
- [ ] Health controller created
- [ ] API endpoints tested
- [ ] Swagger documentation updated

### Phase 6 (Integration)
- [ ] Main app module updated
- [ ] Migration scripts added
- [ ] Basic tests created
- [ ] Full integration tested

### Phase 7 (Documentation)
- [ ] CLAUDE.md updated
- [ ] Development guide created
- [ ] Team documentation reviewed

## Success Verification

### Manual Testing Steps
1. **Primary Connection**: Set valid `DATABASE_URL`, start app, verify connection
2. **Fallback Test**: Use invalid primary URL, verify fallback activation
3. **Docker Fallback**: Remove all external URLs, verify Docker container deployment
4. **Health Endpoints**: Test all `/health/database/*` endpoints
5. **Migration System**: Create test migration, verify deployment

### Automated Tests
```bash
# Run all database tests
yarn test database

# Run integration tests
yarn test:e2e

# Test Docker fallback specifically
yarn test database/docker-fallback
```

## Rollback Plan

If issues arise during implementation:

1. **Immediate**: Comment out `DatabaseModule` import in `api.module.ts`
2. **Dependencies**: Remove database dependencies if causing conflicts
3. **Docker**: Stop any created containers: `docker stop wrytlabs-postgres-dev`
4. **Files**: Git revert to restore previous state
5. **Environment**: Remove database environment variables

## Support & Troubleshooting

### Common Issues
- **Port conflicts**: Check if port 5433 is available
- **Docker issues**: Verify Docker daemon is running
- **Permission errors**: Check database user permissions
- **Connection timeouts**: Verify network connectivity

### Debug Commands
```bash
# Check container status
docker ps | grep postgres

# View container logs
docker logs wrytlabs-postgres-dev

# Test database connection
yarn db:studio

# View Prisma client logs
DEBUG="prisma:client" yarn dev
```