import { Module } from '@nestjs/common';
import { AlchemyService } from './alchemy.service';
import { AlchemyController } from './alchemy.controller';
import { AlchemyCacheService } from './alchemy.cache.service';

@Module({
  providers: [AlchemyService, AlchemyCacheService],
  controllers: [AlchemyController],
  exports: [AlchemyService],
})
export class AlchemyModule {}
