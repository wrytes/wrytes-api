import { Module } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { DockerBuildService } from './docker.build.service';
import { DockerBuildController } from './docker.build.controller';
import { DockerDatabaseService } from './docker.database.service';

@Module({
	providers: [DockerClient, DockerBuildService, DockerDatabaseService],
	controllers: [DockerBuildController],
	exports: [DockerDatabaseService],
})
export class DockerModule {}
