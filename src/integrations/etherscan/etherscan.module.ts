import { Module } from '@nestjs/common';
import { EtherscanService } from './etherscan.service';
import { EtherscanController } from './etherscan.controller';
import { EtherscanCacheService } from './etherscan.cache.service';

@Module({
  providers: [EtherscanService, EtherscanCacheService],
  controllers: [EtherscanController],
  exports: [EtherscanService],
})
export class EtherscanModule {}
