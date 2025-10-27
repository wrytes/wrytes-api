import { IsEthereumAddress, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetTokenBalanceDto {
	@IsEthereumAddress()
	address: string;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => parseInt(value))
	chainid?: number = 1;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => parseInt(value))
	page?: number = 1;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => parseInt(value))
	offset?: number = 100;
}
