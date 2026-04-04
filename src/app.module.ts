import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Config
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import telegramConfig from './config/telegram.config';
import aiConfig from './config/ai.config';
import etherscanConfig from './config/etherscan.config';
import { validationSchema } from './config/validation.schema';

// Core modules
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './core/health/health.module';

// Integration modules
import { TelegramModule } from './integrations/telegram/telegram.module';
import { AiModule } from './integrations/ai/ai.module';
import { EtherscanModule } from './integrations/etherscan/etherscan.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';

// Common modules
import { EventsModule } from './common/events/events.module';

// App
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, telegramConfig, aiConfig, etherscanConfig],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
      },
    }),

    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),

    ScheduleModule.forRoot(),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),

    DatabaseModule,
    HealthModule,
    TelegramModule,
    AiModule,
    EtherscanModule,
    AuthModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
