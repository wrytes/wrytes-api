import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Update, Start, Command, Ctx, InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { AuthService } from '../../modules/auth/auth.service';

@Update()
@Injectable()
export class TelegramUpdate implements OnModuleInit {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly authService: AuthService,
  ) {}

  async onModuleInit() {
    try {
      await this.bot.telegram.setMyCommands([
        { command: 'start', description: 'Register and show available commands' },
        { command: 'me', description: 'Show your account info' },
        { command: 'api_create', description: 'Generate a magic link to create an API key' },
      ]);
    } catch (err) {
      this.logger.warn(`Failed to set bot commands: ${err.message}`);
    }
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const { id: userId, isNew } = await this.authService.getOrCreateUser(
      BigInt(from.id),
      from.username,
    );

    const handle = from.username ? `@${from.username}` : from.first_name;

    if (isNew) {
      await ctx.reply(
        `Welcome to Wrytes, ${handle}!\n\n` +
        `Your account has been created.\n\n` +
        `Available commands:\n` +
        `/me — Show your account info\n` +
        `/api_create — Generate an API key`,
      );
      this.logger.log(`New user registered: ${userId} (${handle})`);
    } else {
      await ctx.reply(
        `Welcome back, ${handle}!\n\n` +
        `Available commands:\n` +
        `/me — Show your account info\n` +
        `/api_create — Generate an API key`,
      );
    }
  }

  @Command('me')
  async onMe(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const user = await this.authService.findUserByTelegramId(BigInt(from.id));
    if (!user) {
      await ctx.reply('You are not registered. Send /start to create an account.');
      return;
    }

    const keys = await this.authService.listApiKeys(user.id);
    const handle = from.username ? `@${from.username}` : from.first_name;

    await ctx.reply(
      `Account: ${handle}\n` +
      `ID: ${user.id}\n` +
      `API keys: ${keys.length} active\n\n` +
      `Use /api_create to generate a new API key.`,
    );
  }

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

      const baseUrl = process.env.BASE_URL || 'http://localhost:3030';
      const magicLink = `${baseUrl}/auth/verify?token=${token}`;
      const expiresIn = Math.round((expiresAt.getTime() - Date.now()) / 60000);

      await ctx.reply(
        `Magic link generated!\n\n` +
        `Visit the link below to retrieve your API key:\n` +
        `${magicLink}\n\n` +
        `Expires in ${expiresIn} minutes. Single use only.`,
      );
    } catch (err) {
      this.logger.error(`Failed to create magic link: ${err.message}`);
      await ctx.reply('Failed to generate magic link. Please try again.');
    }
  }
}
