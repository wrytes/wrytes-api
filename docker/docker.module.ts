import { Module } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { DockerBuildService } from './docker.build.service';
import { DockerBuildController } from './docker.build.controller';

@Module({
	providers: [DockerClient, DockerBuildService],
	controllers: [DockerBuildController],
})
export class DockerModule {}
