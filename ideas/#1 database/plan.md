# Database Module Implementation Plan

## Executive Summary

This plan outlines the implementation of a robust database module for the WrytLabs API, featuring automatic Docker fallback, TypeScript-first design, and seamless integration with the existing NestJS architecture.

## Technology Stack Decision

**Primary Database**: PostgreSQL 15+
**ORM**: Prisma (recommended for TypeScript-first approach)
**Docker**: PostgreSQL 15-alpine official image
**Health Monitoring**: Custom endpoints integrated with existing API structure

### Rationale
- **Prisma**: Provides excellent TypeScript support, type-safe queries, and built-in migration system
- **PostgreSQL**: Robust, production-ready, excellent Docker support
- **Integration**: Leverages existing DockerModule and configuration patterns

## Phase 1: Foundation & Configuration

### 1.1 Dependencies & Setup
```bash
yarn add prisma @prisma/client
yarn add -D prisma-dbml-generator
```

### 1.2 Database Module Structure
```
/database
├── database.module.ts          # Main module
├── database.service.ts         # Connection management
├── database.config.ts          # Configuration service
├── health/
│   ├── database-health.controller.ts
│   └── database-health.service.ts
├── migrations/                 # Prisma migrations
├── schema.prisma              # Database schema
└── types/
    └── database.types.ts      # TypeScript interfaces
```

### 1.3 Environment Configuration Extension
Extend `api.config.ts` with database configuration:
```typescript
export const DATABASE_CONFIG = {
  primary: process.env.DATABASE_URL,
  fallback: process.env.DATABASE_FALLBACK_URL,
  dockerFallback: true,
  retryAttempts: 3,
  retryDelay: 5000,
  connectionTimeout: 30000,
  poolSize: 10
}
```

Required environment variables:
- `DATABASE_URL` (primary connection)
- `DATABASE_FALLBACK_URL` (optional secondary)
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (Docker fallback)

## Phase 2: Docker Integration

### 2.1 Extend DockerModule
Add PostgreSQL container management to existing `docker/` module:

**New files:**
- `docker/docker.database.service.ts` - PostgreSQL container lifecycle
- `docker/docker.database.types.ts` - Database container types

**Integration points:**
- Extend `DockerModule` to include database services
- Leverage existing `DockerClient` service
- Follow existing Docker service patterns

### 2.2 Container Configuration
```typescript
const POSTGRES_CONTAINER_CONFIG = {
  image: 'postgres:15-alpine',
  name: 'wrytlabs-postgres-dev',
  ports: { '5432/tcp': [{ HostPort: '5433' }] },
  env: [
    'POSTGRES_DB=wrytlabs_dev',
    'POSTGRES_USER=wrytlabs',
    'POSTGRES_PASSWORD=dev_password'
  ],
  healthCheck: {
    test: ['CMD-SHELL', 'pg_isready -U wrytlabs'],
    interval: 10000,
    timeout: 5000,
    retries: 5
  }
}
```

### 2.3 Automatic Fallback Logic
1. Attempt primary `DATABASE_URL` connection
2. On failure, try `DATABASE_FALLBACK_URL` if available
3. If both fail, check if Docker is available
4. Deploy PostgreSQL container automatically
5. Wait for container health check
6. Connect to containerized database

## Phase 3: Database Service Implementation

### 3.1 DatabaseService Architecture
```typescript
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;
  private connectionStatus: DatabaseConnectionStatus;
  private dockerFallbackActive: boolean = false;

  // Connection management
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  async healthCheck(): Promise<DatabaseHealth>
  
  // Docker fallback
  private async attemptDockerFallback(): Promise<void>
  private async waitForContainerReady(): Promise<void>
}
```

### 3.2 Connection Strategy
1. **Primary Connection**: Direct connection to `DATABASE_URL`
2. **Retry Logic**: 3 attempts with exponential backoff
3. **Health Monitoring**: Continuous connection health checks
4. **Graceful Degradation**: Clear error states and fallback indicators

### 3.3 Prisma Integration
- Schema-first approach with `schema.prisma`
- Auto-generated TypeScript types
- Migration system for schema evolution
- Connection pooling and query optimization

## Phase 4: Health Check Endpoints

### 4.1 Health Controller Structure
Integrate with existing API structure:
```typescript
@Controller('health')
export class DatabaseHealthController {
  @Get('database')
  async getDatabaseHealth(): Promise<DatabaseHealthResponse>
  
  @Get('database/status')
  async getConnectionStatus(): Promise<ConnectionStatusResponse>
  
  @Get('database/connections')
  async getActiveConnections(): Promise<ConnectionsResponse>
  
  @Get('database/migrations')
  async getMigrationStatus(): Promise<MigrationStatusResponse>
  
  @Get('database/performance')
  async getPerformanceMetrics(): Promise<PerformanceResponse>
}
```

### 4.2 Response Types
```typescript
interface DatabaseHealthResponse {
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
```

### 4.3 Swagger Integration
Extend existing Swagger configuration to include database health endpoints with proper documentation and examples.

## Phase 5: Migration System

### 5.1 Prisma Migrations
- Use Prisma's built-in migration system
- Version-controlled schema changes
- Development and production migration strategies

### 5.2 Migration Workflow
```bash
# Development
npx prisma migrate dev --name description

# Production deployment
npx prisma migrate deploy
```

### 5.3 Schema Evolution Strategy
- Backward-compatible changes when possible
- Feature flags for breaking changes
- Rollback procedures for failed migrations

## Phase 6: Testing Strategy

### 6.1 Unit Tests
- `DatabaseService` connection logic
- Health check functions
- Docker fallback mechanisms
- Error handling scenarios

### 6.2 Integration Tests
- Database connectivity tests
- Docker container lifecycle tests
- Migration system tests
- Health endpoint integration

### 6.3 E2E Tests
- Full application with database
- Fallback scenario testing
- Performance benchmarks

## Phase 7: Monitoring & Observability

### 7.1 Logging Integration
Extend existing NestJS Logger:
- Connection status changes
- Fallback activations
- Query performance metrics
- Error tracking

### 7.2 Metrics Collection
- Connection pool utilization
- Query execution times
- Error rates and types
- Docker container resource usage

## Implementation Timeline

**Week 1: Foundation**
- Dependencies setup
- Basic module structure
- Environment configuration

**Week 2: Docker Integration**
- Extend DockerModule
- Container management
- Fallback logic implementation

**Week 3: Database Service**
- Prisma setup and configuration
- Connection management
- Health check implementation

**Week 4: Health Endpoints**
- Controller implementation
- Response types and validation
- Swagger documentation

**Week 5: Testing & Refinement**
- Comprehensive test suite
- Performance optimization
- Documentation completion

## Risk Mitigation

### Technical Risks
- **Docker availability**: Graceful degradation when Docker is unavailable
- **Connection timeouts**: Comprehensive retry and timeout handling
- **Migration failures**: Rollback procedures and validation

### Operational Risks
- **Data persistence**: Proper volume mounting for Docker containers
- **Environment consistency**: Clear configuration documentation
- **Performance impact**: Connection pooling and query optimization

## Success Metrics

1. **Reliability**: 99.9% database connection uptime
2. **Performance**: < 100ms health check response times
3. **Developer Experience**: Zero-configuration development setup
4. **Fallback Effectiveness**: Automatic Docker deployment in < 30 seconds
5. **Type Safety**: 100% TypeScript coverage for database operations

## Next Steps

1. **Approval**: Review and approve implementation plan
2. **Environment Setup**: Prepare development and testing environments
3. **Implementation**: Begin Phase 1 development
4. **Testing**: Concurrent test development with implementation
5. **Documentation**: Update CLAUDE.md with database module information
6. **Deployment**: Production rollout strategy