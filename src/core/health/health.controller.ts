import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@Injectable()
class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (err) {
      throw new HealthCheckError('Database check failed', this.getStatus(key, false, { error: err.message }));
    }
  }
}

@Controller('health')
@ApiTags('Health')
export class HealthController {
  private readonly db: DatabaseHealthIndicator;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {
    this.db = new DatabaseHealthIndicator(prisma);
  }

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }
}
