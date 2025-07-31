import { IsString, Length, IsOptional } from 'class-validator';

export class CreateRoleDto {
	@IsString()
	@Length(1, 50)
	name: string;

	@IsOptional()
	@IsString()
	description?: string;
}
