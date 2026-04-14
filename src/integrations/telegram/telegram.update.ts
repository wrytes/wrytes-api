import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Update, Start, Command, Ctx, InjectBot, Action } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { AuthService } from '../../modules/auth/auth.service';
import { UserWalletsService } from '../../modules/user-wallets/user-wallets.service';
import { TelegramService } from './telegram.service';

@Update()
@Injectable()
export class TelegramUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly authService: AuthService,
    private readonly userWalletsService: UserWalletsService,
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit() {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Register and show available commands' },
        { command: 'me', description: 'Show your account info' },
        { command: 'api_create', description: 'Generate a magic link to create an API key' },
        { command: 'link', description: 'Link a wallet — usage: /link <token>' },
        { command: 'wallets', description: 'List your linked wallets' },
      ]);
    } catch (err) {
      this.logger.warn(`Failed to set bot commands: ${err.message}`);
    }
  }

  // ── /start ──────────────────────────────────────────────────────────────────

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const { id: userId, isNew } = await this.authService.getOrCreateUser(
      BigInt(from.id),
      from.username,
    );

    const handle = from.username ? `@${from.username}` : from.first_name;

    const commandList =
      `/me — Show your account info\n` +
      `/api_create — Generate an API key\n` +
      `/link <token> — Link a wallet from the app\n` +
      `/wallets — List linked wallets`;

    if (isNew) {
      await ctx.reply(
        `Welcome to Wrytes, ${handle}!\n\nYour account has been created.\n\nAvailable commands:\n${commandList}`,
      );
      this.logger.log(`New user registered: ${userId} (${handle})`);
    } else {
      await ctx.reply(`Welcome back, ${handle}!\n\nAvailable commands:\n${commandList}`);
    }
  }

  // ── /me ─────────────────────────────────────────────────────────────────────

  @Command('me')
  async onMe(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const user = await this.authService.findUserByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.reply('You are not registered. Send /start to create an account.');
      return;
    }

    const handle = from.username ? `@${from.username}` : from.first_name;
    const keys = await this.authService.listApiKeys(user.id);
    const wallets = await this.userWalletsService.listWallets(user.id);

    const walletLines =
      wallets.length > 0
        ? wallets
            .map((w: { address: string }) => `  • ${w.address.slice(0, 6)}...${w.address.slice(-4)}`)
            .join('\n')
        : '  None linked yet — use /link <token>';

    await ctx.reply(
      `Account: ${handle}\n` +
        `ID: ${user.id}\n` +
        `API keys: ${keys.length} active\n\n` +
        `Linked wallets:\n${walletLines}\n\n` +
        `Use /api_create to generate a new API key.\n` +
        `Use /link <token> to link a wallet from the app.`,
    );
  }

  // ── /api_create ─────────────────────────────────────────────────────────────

  @Command('api_create')
  async onApiCreate(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const user = await this.authService.findUserByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.reply('You are not registered. Send /start to create an account.');
      return;
    }

    try {
      const { token, expiresAt } = await this.authService.createMagicLink(user.id);
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const magicLink = `${appUrl}/auth/api-key?token=${token}`;
      const expiresIn = Math.round((expiresAt.getTime() - Date.now()) / 60000);

      await ctx.reply(
        `Magic link generated!\n\n` +
          `Visit the link below to retrieve your API key:\n${magicLink}\n\n` +
          `Expires in ${expiresIn} minutes. Single use only.`,
      );
    } catch (err) {
      this.logger.error(`Failed to create magic link: ${err.message}`);
      await ctx.reply('Failed to generate magic link. Please try again.');
    }
  }

  // ── /link <token> ───────────────────────────────────────────────────────────

  @Command('link')
  async onLink(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const text = (ctx.message as any)?.text as string | undefined;
    const parts = text?.trim().split(/\s+/) ?? [];
    const token = parts[1];

    if (!token) {
      await ctx.reply(
        'Usage: /link <token>\n\nGet your link token from the Wrytes app after connecting your wallet.',
      );
      return;
    }

    try {
      const { address } = await this.userWalletsService.consumeLinkToken(
        token,
        BigInt(from.id),
      );
      const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
      await ctx.reply(
        `✅ Wallet linked successfully!\n\n` +
          `Address: ${short}\n\n` +
          `You can now sign in with this wallet on the Wrytes app.`,
      );
    } catch (err) {
      this.logger.warn(`Link token failed for user ${from.id}: ${err.message}`);
      await ctx.reply(`❌ Failed to link wallet: ${err.message}`);
    }
  }

  // ── /wallets ─────────────────────────────────────────────────────────────────

  @Command('wallets')
  async onWallets(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const user = await this.authService.findUserByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.reply('You are not registered. Send /start first.');
      return;
    }

    const wallets = await this.userWalletsService.listWallets(user.id);

    if (wallets.length === 0) {
      await ctx.reply(
        'No wallets linked yet.\n\nConnect your wallet in the Wrytes app and use /link <token> to link it here.',
      );
      return;
    }

    const lines = wallets
      .map((w: { address: string; label?: string | null }, i: number) => {
        const short = `${w.address.slice(0, 6)}...${w.address.slice(-4)}`;
        const label = w.label ? ` (${w.label})` : '';
        return `${i + 1}. ${short}${label}`;
      })
      .join('\n');

    await ctx.reply(`Your linked wallets:\n\n${lines}`);
  }

  // ── Wallet 2FA callbacks ────────────────────────────────────────────────────

  @Action(/^wallet_auth:allow:.+$/)
  async onWalletAuthAllow(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const data = (ctx.callbackQuery as any)?.data as string;
    const sessionId = data.split(':')[2];

    try {
      await this.userWalletsService.approveSession(sessionId, BigInt(from.id));

      const info = await this.userWalletsService.getSessionTelegramInfo(sessionId);
      if (info?.msgId) {
        await this.telegramService.editWalletAuthMessage(
          info.chatId,
          info.msgId,
          `✅ *Sign-In Approved*\n\nYour wallet has been authenticated. You can close Telegram.`,
        );
      }

      await ctx.answerCbQuery('Sign-in approved ✅');
    } catch (err) {
      this.logger.warn(`Allow callback failed: ${err.message}`);
      await ctx.answerCbQuery(`Failed: ${err.message}`, { show_alert: true });
    }
  }

  @Action(/^wallet_auth:deny:.+$/)
  async onWalletAuthDeny(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const data = (ctx.callbackQuery as any)?.data as string;
    const sessionId = data.split(':')[2];

    try {
      await this.userWalletsService.denySession(sessionId, BigInt(from.id));

      const info = await this.userWalletsService.getSessionTelegramInfo(sessionId);
      if (info?.msgId) {
        await this.telegramService.editWalletAuthMessage(
          info.chatId,
          info.msgId,
          `❌ *Sign-In Denied*\n\nThe wallet sign-in request was rejected.`,
        );
      }

      await ctx.answerCbQuery('Sign-in denied ❌');
    } catch (err) {
      this.logger.warn(`Deny callback failed: ${err.message}`);
      await ctx.answerCbQuery(`Failed: ${err.message}`, { show_alert: true });
    }
  }
}
