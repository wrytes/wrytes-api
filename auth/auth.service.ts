import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isAddress, isHex, zeroAddress } from 'viem';
import { WalletService } from 'wallet/wallet.service';
import { AuthAccessToken, AuthPayload, CreateMessageOptions, SignInOptions } from './auth.types';
import { formatMinutes } from 'utils/format';

@Injectable()
export class AuthService {
	constructor(
		private readonly wallet: WalletService,
		private jwtService: JwtService
	) {}

	createMessage({ address, valid, expired }: CreateMessageOptions) {
		const now = Date.now();

		// input validation
		if (valid == undefined || valid < now) valid = now;
		if (expired == undefined || expired < now) expired = now + formatMinutes(10);

		// return message to sign
		return `Signing this message confirms your control over the wallet address: ${address} valid: ${valid} expired: ${expired}`;
	}

	async signIn({ message, signature }: SignInOptions): Promise<AuthAccessToken | { error: string }> {
		// verify message input
		const messageSplit = message.split(' ');
		const findAddress = messageSplit.findIndex((i) => i == 'address:');
		const findValid = messageSplit.findIndex((i) => i == 'valid:');
		const findExpired = messageSplit.findIndex((i) => i == 'expired:');

		if ([findAddress, findValid, findExpired].includes(-1)) throw new BadRequestException('Property is missing in message');

		const input = {
			address: messageSplit.at(findAddress + 1),
			valid: Number(messageSplit.at(findValid + 1)),
			expired: Number(messageSplit.at(findExpired + 1)),
		};

		if (!isAddress(input.address) || input.address == zeroAddress) throw new BadRequestException('Address is not valid');
		if (isNaN(input.valid) || input.valid > Date.now()) throw new BadRequestException('Valid timestamp is not valid');
		if (isNaN(input.expired) || input.expired < Date.now()) throw new BadRequestException('Expired timestamp is not valid');

		const messageTemplate = this.createMessage({ address: input.address }).split(' ');
		const messageOriginal = messageTemplate.slice(0, findAddress).join(' ');
		const messageParsed = messageSplit.slice(0, findAddress).join(' ');

		// verify message
		if (messageOriginal != messageParsed || messageTemplate.length != messageSplit.length)
			throw new BadRequestException('Message is not valid');

		// @dev: optional add verify whitelisted address or linked to an AccessManager
		// TODO: add AccessManager verification from onChain data or indexer (?)

		// verify signature input
		if (!isHex(signature)) throw new BadRequestException('Signature is not hex type: 0x...');

		// verify signature
		try {
			const isValid = await this.wallet.verifySignature({
				message,
				signature,
				expectedAddress: input.address,
			});

			// is not valid?
			if (!isValid) {
				throw new BadRequestException('Signature is not valid');
			}
		} catch (e) {
			throw new BadRequestException('Signature is not valid');
		}

		// create payload and return access token
		return this.signPayload({ address: input.address });
	}

	private async signPayload(payload: AuthPayload): Promise<AuthAccessToken> {
		return {
			accessToken: await this.jwtService.signAsync(payload),
		};
	}
}
