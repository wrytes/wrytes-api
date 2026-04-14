import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TelegramService } from '../../integrations/telegram/telegram.service';
import { UserWalletsService } from '../../modules/user-wallets/user-wallets.service';
import { WalletAuthRequestEvent } from '../events/wallet.events';

@Injectable()
export class WalletAuthListener {
  private readonly logger = new Logger(WalletAuthListener.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly userWalletsService: UserWalletsService,
  ) {}

  @OnEvent('wallet.auth.request')
  async handleAuthRequest(event: WalletAuthRequestEvent): Promise<void> {
    const { sessionId, walletAddress, telegramChatId, expiresAt } = event;

    try {
      const messageId = await this.telegramService.sendWalletAuthRequest(
        telegramChatId,
        sessionId,
        walletAddress,
        expiresAt,
      );
      await this.userWalletsService.setSessionTelegramMsgId(sessionId, messageId);
    } catch (err) {
      this.logger.error(
        `Failed to send wallet auth 2FA to chat ${telegramChatId}: ${err.message}`,
      );
    }
  }
}
