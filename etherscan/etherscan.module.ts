import { Module } from '@nestjs/common';
import { EtherscanService } from './etherscan.service';
import { EtherscanController } from './etherscan.controller';
import { EtherscanCacheService } from './etherscan.cache.service';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
	imports: [DatabaseModule, UsersModule, RolesModule],
	providers: [EtherscanService, EtherscanCacheService],
	controllers: [EtherscanController],
	exports: [EtherscanService, EtherscanCacheService],
})
export class EtherscanModule {}
