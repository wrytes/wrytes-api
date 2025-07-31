# Database Module

## Quick Start

1. Copy `.env.example` to `.env.local`
2. Run `yarn db:generate` to generate Prisma client
3. Run `yarn dev` - database will auto-deploy via Docker if needed

## Commands

### Development
- `yarn db:studio` - Open Prisma Studio for database management
- `yarn db:migrate` - Create and apply migration
- `yarn db:push` - Push schema changes directly to database
- `yarn db:generate` - Generate Prisma client from schema
- `yarn db:reset` - Reset database with fresh migrations

### Production
- `yarn db:migrate:deploy` - Deploy pending migrations to production
- `yarn db:generate` - Generate client (run after schema changes)

## Architecture

### Connection Fallback System

The database module implements a three-tier connection strategy:

1. **Primary Connection**: Uses `DATABASE_URL` environment variable
2. **Fallback Connection**: Uses `DATABASE_FALLBACK_URL` if primary fails
3. **Docker Fallback**: Automatically deploys PostgreSQL container if both external connections fail

### Health Monitoring

Access comprehensive health information via REST endpoints:

- `GET /health/database` - Overall health status
- `GET /health/database/status` - Connection details
- `GET /health/database/performance` - Query metrics
- `GET /health/database/migrations` - Migration status

### Schema Management

The database schema is defined in `database/schema.prisma`. Key features:

- **Type Generation**: Automatic TypeScript type generation
- **Migration System**: Version-controlled schema changes
- **DBML Export**: Visual database documentation

## Configuration

### Environment Variables

```bash
# Primary database connection
DATABASE_URL="postgresql://user:password@localhost:5432/wrytlabs?schema=public"

# Optional fallback connection
DATABASE_FALLBACK_URL="postgresql://user:password@backup:5432/wrytlabs?schema=public"

# Docker fallback configuration (used automatically)
POSTGRES_USER=wrytlabs
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=wrytlabs_dev
```

### Docker Container Configuration

When Docker fallback is activated, the system creates a PostgreSQL container with:

- **Image**: `postgres:15-alpine`
- **Container Name**: `wrytlabs-postgres-dev`
- **Port**: `5433` (mapped to host)
- **Database**: `wrytlabs_dev`
- **Health Checks**: Automatic `pg_isready` monitoring

## Usage Examples

### Basic Database Operations

```typescript
import { DatabaseService } from './database/database.service';

@Injectable()
export class MyService {
  constructor(private readonly database: DatabaseService) {}

  async createRecord() {
    const prisma = this.database.getPrismaClient();
    if (!prisma) throw new Error('Database not connected');

    return await prisma.systemHealth.create({
      data: {
        status: 'healthy',
        metadata: { source: 'api' }
      }
    });
  }
}
```

### Health Check Integration

```typescript
import { DatabaseHealthService } from './database/health/database-health.service';

@Injectable()
export class HealthService {
  constructor(private readonly dbHealth: DatabaseHealthService) {}

  async getSystemStatus() {
    const dbHealth = await this.dbHealth.getOverallHealth();
    return {
      database: dbHealth.status,
      connectionSource: dbHealth.connection
    };
  }
}
```

## Troubleshooting

### Common Issues

**Connection Failures**
- Verify `DATABASE_URL` format and credentials
- Check if PostgreSQL server is running
- Ensure firewall allows connections on specified port

**Docker Issues**
- Verify Docker daemon is running: `docker ps`
- Check port conflicts: `lsof -i :5433`
- View container logs: `docker logs wrytlabs-postgres-dev`

**Migration Errors**
- Reset database: `yarn db:reset`
- Check schema syntax in `database/schema.prisma`
- Verify database permissions for DDL operations

### Debug Commands

```bash
# Test database connection
yarn db:studio

# View container status
docker ps | grep postgres

# Check database logs
docker logs wrytlabs-postgres-dev

# Inspect Prisma client generation
DEBUG="prisma:client" yarn dev

# Manual container management
docker stop wrytlabs-postgres-dev
docker rm wrytlabs-postgres-dev
```

### Performance Monitoring

Monitor database performance through health endpoints:

```bash
# Overall health
curl http://localhost:3000/health/database

# Performance metrics
curl http://localhost:3000/health/database/performance

# Active connections
curl http://localhost:3000/health/database/connections
```

## Development Workflow

### Adding New Models

1. Edit `database/schema.prisma`
2. Run `yarn db:migrate` to create migration
3. Run `yarn db:generate` to update Prisma client
4. Update TypeScript types if needed

### Schema Changes

1. Modify schema in `database/schema.prisma`
2. Create migration: `yarn db:migrate`
3. Review generated migration in `database/migrations/`
4. Test migration on development data
5. Deploy to production: `yarn db:migrate:deploy`

### Testing

Run database tests with Docker fallback:

```bash
# Unit tests
yarn test database

# Integration tests with real database
yarn test:e2e

# Test Docker fallback specifically
docker stop $(docker ps -q --filter "name=postgres")
yarn test database/docker-fallback
```