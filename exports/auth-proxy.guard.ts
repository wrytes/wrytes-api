import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators';
import { AuthProxyService } from './auth-proxy.service';

@Injectable()
export class AuthProxyGuard implements CanActivate {
  constructor(
    private readonly authProxy: AuthProxyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req   = ctx.switchToHttp().getRequest<Record<string, any>>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException();

    const user  = await this.authProxy.resolve(token);
    req['user']   = user;
    req['scopes'] = user.scopes;

    return true;
  }

  private extractToken(req: Record<string, any>): string | null {
    const auth = req['headers']?.['authorization'] as string | undefined;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    const key = req['headers']?.['x-api-key'] as string | undefined;
    if (key) return key;

    return null;
  }
}
