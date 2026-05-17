import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { WrytesUser } from './types';

export const WRYTES_API_URL = 'WRYTES_API_URL';

interface CacheEntry {
  user:      WrytesUser;
  expiresAt: number;
}

/**
 * Resolves a Bearer token or rw_prod_ API key against wrytes-api /auth/me.
 * Results are cached in-memory for 5 minutes — keyed by SHA-256 of the raw token
 * so the token itself is never stored in cache.
 */
@Injectable()
export class AuthProxyService {
  private readonly logger = new Logger(AuthProxyService.name);
  private readonly cache  = new Map<string, CacheEntry>();
  private readonly ttlMs  = 5 * 60 * 1_000;

  constructor(@Inject(WRYTES_API_URL) private readonly wrytesApiUrl: string) {}

  async resolve(rawToken: string): Promise<WrytesUser> {
    const key    = createHash('sha256').update(rawToken).digest('hex');
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.user;
    if (cached) this.cache.delete(key);

    const isApiKey = rawToken.startsWith('rw_prod_');
    const headers: Record<string, string> = isApiKey
      ? { 'x-api-key': rawToken }
      : { authorization: `Bearer ${rawToken}` };

    let res: Response;
    try {
      res = await fetch(`${this.wrytesApiUrl}/auth/me`, {
        headers,
        signal: AbortSignal.timeout(5_000),
      });
    } catch (err: any) {
      this.logger.error(`/auth/me unreachable: ${err?.message}`);
      throw new UnauthorizedException('Auth service unavailable');
    }

    if (!res.ok) {
      this.logger.warn(`/auth/me → ${res.status}`);
      throw new UnauthorizedException();
    }

    const user = (await res.json()) as WrytesUser;
    this.cache.set(key, { user, expiresAt: Date.now() + this.ttlMs });

    // Lazy eviction — keep memory bounded
    if (this.cache.size > 2_000) this.evict();

    return user;
  }

  /** Force-expire a token from the cache (e.g. on logout) */
  invalidate(rawToken: string): void {
    this.cache.delete(createHash('sha256').update(rawToken).digest('hex'));
  }

  private evict(): void {
    const now = Date.now();
    for (const [k, v] of this.cache) {
      if (v.expiresAt <= now) this.cache.delete(k);
    }
  }
}
