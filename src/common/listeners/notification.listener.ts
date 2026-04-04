import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import { TelegramService } from '../../integrations/telegram/telegram.service';
import { AdminNotificationEvent, NotificationEvent, NotificationLevel } from '../events/notification.events';

const LEVEL_EMOJI: Record<NotificationLevel, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
  ) {}

  @OnEvent('notification')
  async handleNotification(event: NotificationEvent) {
    const user = await this.prisma.user.findUnique({
      where: { id: event.userId },
    });

    if (!user || !user.notificationsEnabled) return;

    const chatId = Number(user.telegramId);
    const emoji = LEVEL_EMOJI[event.level];
    const message = `${emoji} *${event.title}*\n\n${event.message}`;

    await this.telegramService.sendMarkdownMessage(chatId, message).catch((err) => {
      this.logger.error(`Failed to send notification to user ${event.userId}: ${err.message}`);
    });
  }

  @OnEvent('notification.admin')
  async handleAdminNotification(event: AdminNotificationEvent) {
    const adminScopes = await this.prisma.userScope.findMany({
      where: { scopeKey: 'ADMIN' },
      include: { user: true },
    });

    const emoji = LEVEL_EMOJI[event.level];
    const message = `${emoji} *${event.title}*\n\n${event.message}`;

    await Promise.all(
      adminScopes.map(({ user }) =>
        this.telegramService.sendMarkdownMessage(Number(user.telegramId), message).catch((err) => {
          this.logger.error(`Failed to send admin notification to user ${user.id}: ${err.message}`);
        }),
      ),
    );
  }
}
