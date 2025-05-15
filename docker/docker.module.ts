import { Module } from '@nestjs/common';
import { DockerClient } from './docker.client.service';
import { DockerBuildService } from './docker.build.service';
import { DockerBuildController } from './docker.build.controller';
import { DockerDeployService } from './docker.deploy.service';
import { DockerDeployController } from './docker.deploy.controller';

@Module({
	providers: [DockerClient, DockerBuildService, DockerDeployService],
	controllers: [DockerBuildController, DockerDeployController],
})
export class DockerModule {}
