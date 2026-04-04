import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userScopes: string[] = request.userScopes ?? [];

    if (userScopes.includes('ADMIN')) return true;

    const hasAll = required.every((s) => userScopes.includes(s));
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required scope(s): ${required.filter((s) => !userScopes.includes(s)).join(', ')}`,
      );
    }

    return true;
  }
}
