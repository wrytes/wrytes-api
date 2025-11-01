import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isAddress, isHex, zeroAddress, Address, recoverMessageAddress } from 'viem';
import { AuthAccessToken, AuthPayload, CreateMessageOptions, SignInOptions, VerifySignatureOptions } from './auth.types';
import { formatMinutes } from 'utils/format';
import { UserService } from '../users/users.service';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly jwtService: JwtService,
		private readonly userService: UserService
	) {}

	createMessage({ address, valid, expired }: CreateMessageOptions): string {
		this.logger.debug(`Creating message for address: ${address}`);

		// Validate address format
		if (!isAddress(address)) {
			throw new BadRequestException(`Invalid Ethereum address format: ${address}`);
		}

		if (address === zeroAddress) {
			throw new BadRequestException('Zero address is not allowed');
		}

		const now = Date.now();

		// Set default validity and expiration times
		if (valid === undefined || valid < now) {
			valid = now;
		}
		if (expired === undefined || expired < now) {
			expired = now + formatMinutes(10); // 10 minutes default expiration
		}

		// Ensure expired is after valid
		if (expired <= valid) {
			throw new BadRequestException('Expiration time must be after valid time');
		}

		const message = `Signing this message confirms your control over the wallet address: ${address} valid: ${valid} expired: ${expired}`;
		this.logger.debug(`Generated message for ${address}`);

		return message;
	}

	async signIn({ message, signature }: SignInOptions): Promise<AuthAccessToken> {
		this.logger.debug('Processing sign-in request');

		try {
			// Parse and validate message structure
			const parsedMessage = this.parseAuthMessage(message);

			// Validate message timestamps
			this.validateMessageTimestamps(parsedMessage);

			// Verify message format
			this.verifyMessageFormat(message, parsedMessage.address);

			// Validate and verify signature
			await this.verifyWalletSignature(message, signature, parsedMessage.address);

			// Get or create user
			const user = await this.getOrCreateUser(parsedMessage.address);

			this.logger.log(`Successful sign-in for address: ${parsedMessage.address}`);

			// Generate and return token
			return this.signPayload({
				address: parsedMessage.address as Address,
				userId: user?.id,
				username: user?.username || undefined,
			});
		} catch (error) {
			this.logger.error(`Sign-in failed: ${error.message}`);
			throw error;
		}
	}

	private parseAuthMessage(message: string) {
		const messageSplit = message.split(' ');
		const findAddress = messageSplit.findIndex((i) => i === 'address:');
		const findValid = messageSplit.findIndex((i) => i === 'valid:');
		const findExpired = messageSplit.findIndex((i) => i === 'expired:');

		if ([findAddress, findValid, findExpired].includes(-1)) {
			throw new BadRequestException('Required properties missing in message (address, valid, expired)');
		}

		const address = messageSplit.at(findAddress + 1);
		const valid = Number(messageSplit.at(findValid + 1));
		const expired = Number(messageSplit.at(findExpired + 1));

		if (!address || !isAddress(address) || address === zeroAddress) {
			throw new BadRequestException('Invalid or missing wallet address');
		}

		if (isNaN(valid) || isNaN(expired)) {
			throw new BadRequestException('Invalid timestamp format');
		}

		return { address, valid, expired };
	}

	private validateMessageTimestamps(parsedMessage: { valid: number; expired: number }) {
		const now = Date.now();

		if (parsedMessage.valid > now) {
			throw new BadRequestException('Message is not yet valid');
		}

		if (parsedMessage.expired < now) {
			throw new BadRequestException('Message has expired');
		}

		if (parsedMessage.expired <= parsedMessage.valid) {
			throw new BadRequestException('Invalid timestamp sequence');
		}
	}

	private verifyMessageFormat(originalMessage: string, address: string) {
		const messageSplit = originalMessage.split(' ');
		const findAddress = messageSplit.findIndex((i) => i === 'address:');

		// Generate expected message template for comparison
		const messageTemplate = this.createMessage({ address: address as Address }).split(' ');
		const messageOriginal = messageTemplate.slice(0, findAddress).join(' ');
		const messageParsed = messageSplit.slice(0, findAddress).join(' ');

		if (messageOriginal !== messageParsed || messageTemplate.length !== messageSplit.length) {
			throw new BadRequestException('Message format is invalid');
		}
	}

	async verifySignature({ message, signature, expectedAddress }: VerifySignatureOptions): Promise<boolean> {
		try {
			const recoveredAddress = await recoverMessageAddress({
				message,
				signature,
			});

			const isValid = recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();

			this.logger.debug('Signature verification completed', {
				expectedAddress,
				recoveredAddress,
				isValid,
			});

			return isValid;
		} catch (error) {
			this.logger.error('Signature verification failed', {
				error: error.message,
				expectedAddress,
				isValid: false,
			});
			return false;
		}
	}

	private async verifyWalletSignature(message: string, signature: string, expectedAddress: string) {
		if (!isHex(signature)) {
			throw new BadRequestException('Signature must be in hex format (0x...)');
		}

		try {
			const isValid = await this.verifySignature({
				message,
				signature,
				expectedAddress: expectedAddress as Address,
			});

			if (!isValid) {
				throw new UnauthorizedException('Invalid wallet signature');
			}
		} catch (error) {
			this.logger.warn(`Signature verification failed: ${error.message}`);
			throw new UnauthorizedException('Signature verification failed');
		}
	}

	private async getOrCreateUser(walletAddress: string) {
		try {
			let user = await this.userService.getUserByWallet(walletAddress);

			if (!user) {
				this.logger.debug(`Creating new user for address: ${walletAddress}`);
				user = await this.userService.createUser({
					walletAddress,
				});
				this.logger.log(`New user created for address: ${walletAddress}`);
			} else {
				// Update last login time for existing users
				await this.userService.updateLastLogin(user.id);
				this.logger.debug(`Updated last login for user: ${user.id}`);
			}

			return user;
		} catch (error) {
			this.logger.error(`Failed to get or create user: ${error.message}`);
			// For auth purposes, we can continue without user creation
			// but log the error for monitoring
			return null;
		}
	}

	async generateTokenForUser(address: string, user?: any): Promise<AuthAccessToken> {
		this.logger.debug(`Generating token for address: ${address}`);

		return this.signPayload({
			address: address as Address,
			userId: user?.id,
			username: user?.username || undefined,
		});
	}

	private async signPayload(payload: AuthPayload): Promise<AuthAccessToken> {
		return {
			accessToken: await this.jwtService.signAsync(payload),
		};
	}
}
