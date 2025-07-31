import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseHealthController } from './health/database-health.controller';
import { DatabaseHealthService } from './health/database-health.service';
import { DockerModule } from '../docker/docker.module';

@Module({
	imports: [DockerModule],
	providers: [DatabaseService, DatabaseHealthService],
	controllers: [DatabaseHealthController],
	exports: [DatabaseService],
})
export class DatabaseModule {}
