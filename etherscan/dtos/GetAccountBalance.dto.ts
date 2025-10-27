import { IsEthereumAddress, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetAccountBalanceDto {
	@IsEthereumAddress()
	address: string;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => parseInt(value))
	chainid?: number = 1;

	@IsOptional()
	tag?: string = 'latest';
}
