import { Module } from '@nestjs/common';
import { UserWalletsService } from './user-wallets.service';
import { UserWalletsController } from './user-wallets.controller';

@Module({
  providers: [UserWalletsService],
  controllers: [UserWalletsController],
  exports: [UserWalletsService],
})
export class UserWalletsModule {}
