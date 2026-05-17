import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthProxyService, WRYTES_API_URL } from './auth-proxy.service';
import { AuthProxyGuard } from './auth-proxy.guard';
import { ScopesGuard } from './scopes.guard';

export interface WrytesAuthModuleOptions {
  /** Base URL of the wrytes-api instance, e.g. https://api.wrytes.io */
  wrytesApiUrl: string;
  /**
   * Register AuthProxyGuard and ScopesGuard as global APP_GUARDs.
   * Set to false if you prefer to apply the guards manually per-module.
   * Default: true
   */
  global?: boolean;
}

/**
 * Drop-in auth module for services that delegate authentication to wrytes-api.
 *
 * Usage:
 *   WrytesAuthModule.forRoot({ wrytesApiUrl: process.env.WRYTES_API_URL })
 *
 * Every request must carry either:
 *   - Authorization: Bearer <jwt issued by wrytes-api>
 *   - x-api-key: rw_prod_<key>
 *
 * The guard calls GET /auth/me on wrytes-api, caches the result for 5 min,
 * then attaches { user, scopes } to the request object.
 */
@Module({})
export class WrytesAuthModule {
  static forRoot(options: WrytesAuthModuleOptions): DynamicModule {
    const applyGlobally = options.global !== false;

    return {
      module:   WrytesAuthModule,
      global:   true,
      providers: [
        { provide: WRYTES_API_URL, useValue: options.wrytesApiUrl },
        AuthProxyService,
        AuthProxyGuard,
        ScopesGuard,
        ...(applyGlobally
          ? [
              { provide: APP_GUARD, useClass: AuthProxyGuard },
              { provide: APP_GUARD, useClass: ScopesGuard },
            ]
          : []),
      ],
      exports: [AuthProxyService, AuthProxyGuard, ScopesGuard],
    };
  }
}
