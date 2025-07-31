import { IsString, IsEmail, IsOptional, IsObject, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
	@IsString()
	@Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address format' })
	@Transform(({ value }) => value?.toLowerCase())
	walletAddress: string;

	@IsOptional()
	@IsString()
	username?: string;

	@IsOptional()
	@IsEmail()
	email?: string;

	@IsOptional()
	@IsObject()
	profileData?: Record<string, any>;
}
