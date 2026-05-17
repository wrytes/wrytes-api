import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { WrytesUser } from './types';

export const IS_PUBLIC_KEY = 'isPublic';
export const SCOPES_KEY    = 'scopes';

/** Mark a route as public — bypasses AuthProxyGuard */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Require one or more wrytes-api scope keys on a route or controller */
export const RequireScopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);

/** Extract the authenticated WrytesUser from the request */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WrytesUser =>
    ctx.switchToHttp().getRequest().user,
);
