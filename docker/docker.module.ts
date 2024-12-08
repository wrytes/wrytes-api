import { Module } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { DockerBuildService } from './docker.build.service';

@Module({
	providers: [DockerClient, DockerBuildService],
})
export class DockerModule {}
