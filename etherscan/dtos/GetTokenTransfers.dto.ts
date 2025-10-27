import { IsEthereumAddress, IsOptional, IsNumber, IsString, IsIn, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetTokenTransfersDto {
	@IsEthereumAddress()
	address: string;

	@IsOptional()
	@IsEthereumAddress()
	contractaddress?: string;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => parseInt(value))
	chainid?: number = 1;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Transform(({ value }) => parseInt(value))
	startblock?: number = 0;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Transform(({ value }) => parseInt(value))
	endblock?: number = 99999999;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => parseInt(value))
	page?: number = 1;

	@IsOptional()
	@IsNumber()
	@Min(1)
	@Max(10000)
	@Transform(({ value }) => parseInt(value))
	offset?: number = 10;

	@IsOptional()
	@IsString()
	@IsIn(['asc', 'desc'])
	sort?: string = 'desc';
}
