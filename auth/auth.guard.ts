import { BadRequestException, CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { WalletService } from 'wallet/wallet.service';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly wallet: WalletService,
		private jwtService: JwtService,
		private reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);

		if (isPublic) return true;

		const request = context.switchToHttp().getRequest();
		const token = this.extractTokenFromHeader(request);

		if (!token) {
			throw new BadRequestException('Token not found');
		}

		try {
			const payload = await this.jwtService.verifyAsync(token, {
				secret: this.wallet.getJwtSecret(),
			});

			console.log({ payload });
			// TODO: on chain verification, e.g. AccessManager

			request['user'] = payload;
		} catch (e) {
			console.log(e);
			throw new UnauthorizedException();
		}

		return true;
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		// try header
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		if (type === 'Bearer' && token) {
			return token;
		}

		// fallback to cookies
		const cookieHeader = request.headers.cookie;
		if (cookieHeader) {
			const cookies = Object.fromEntries(
				cookieHeader.split(';').map((c) => {
					const [key, ...v] = c.trim().split('=');
					return [key, v.join('=')];
				})
			);

			const cookieToken = cookies['Authorization'] || cookies['token'];
			return cookieToken;
		}

		// resolve to undefined
		return undefined;
	}
}
