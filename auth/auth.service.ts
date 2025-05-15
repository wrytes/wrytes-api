import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { zeroAddress } from 'viem';

@Injectable()
export class AuthService {
	constructor(private jwtService: JwtService) {}

	async signIn(message: string, signature: string): Promise<{ access_token: string }> {
		if (message != signature) {
			throw new UnauthorizedException();
		}
		const payload = { address: zeroAddress };
		return {
			access_token: await this.jwtService.signAsync(payload),
		};
	}
}
