import { BadRequestException, CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
	private readonly logger = new Logger(AuthGuard.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly reflector: Reflector
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(), context.getClass(),
		]);

		if (isPublic) {
			this.logger.debug('Public endpoint accessed - skipping authentication');
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const token = this.extractTokenFromHeader(request);

		if (!token) {
			this.logger.warn('Authentication failed: No token provided', {
				ip: request.ip,
				userAgent: request.headers['user-agent'],
				path: request.path,
			});
			throw new BadRequestException('Token not found');
		}

		try {
			const payload = await this.jwtService.verifyAsync(token);

			request['user'] = payload;
			return true;
		} catch (error) {
			this.logger.error('Token verification failed', {
				error: error.message,
				ip: request.ip,
				userAgent: request.headers['user-agent'],
				path: request.path,
			});
			throw new UnauthorizedException('Invalid or expired token');
		}
	}

	private extractTokenFromHeader(request: Request): string | undefined {
		// Try Authorization header first
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		if (type === 'Bearer' && token) {
			return token;
		}

		// Fallback to cookies
		const cookieHeader = request.headers.cookie;
		if (cookieHeader) {
			const cookies = this.parseCookies(cookieHeader);
			const cookieToken = cookies['Authorization'] || cookies['token'];
			if (cookieToken) {
				return cookieToken;
			}
		}

		this.logger.debug('No token found in headers or cookies');
		return undefined;
	}

	private parseCookies(cookieHeader: string): Record<string, string> {
		return Object.fromEntries(
			cookieHeader.split(';').map((cookie) => {
				const [key, ...valueParts] = cookie.trim().split('=');
				return [key, valueParts.join('=')];
			})
		);
	}
}
