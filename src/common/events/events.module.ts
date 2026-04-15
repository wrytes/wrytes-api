import { Module } from '@nestjs/common';
import { NotificationListener } from '../listeners/notification.listener';
import { WalletAuthListener } from '../listeners/wallet-auth.listener';
import { TelegramModule } from '../../integrations/telegram/telegram.module';
import { UserWalletsModule } from '../../modules/user-wallets/user-wallets.module';

@Module({
  imports: [TelegramModule, UserWalletsModule],
  providers: [NotificationListener, WalletAuthListener],
  exports: [NotificationListener, WalletAuthListener],
})
export class EventsModule {}
