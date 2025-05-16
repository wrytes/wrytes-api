import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNumber, IsOptional } from 'class-validator';
import { Address, zeroAddress } from 'viem';

export class CreateMessageDto {
	constructor() {
		this.address = zeroAddress;
		this.valid = 0;
		this.expired = 0;
	}

	@ApiProperty({ example: zeroAddress, description: 'Ethereum address of the user' })
	@IsEthereumAddress()
	address: Address;

	@ApiProperty({ required: false, example: Date.now(), description: 'Unix timestamp when message becomes valid' })
	@IsOptional()
	@IsNumber()
	valid?: number;

	@ApiProperty({ required: false, example: Date.now() + 3600000, description: 'Unix timestamp when message expires' })
	@IsOptional()
	@IsNumber()
	expired?: number;
}
