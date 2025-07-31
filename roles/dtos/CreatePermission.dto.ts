import { IsString, Length, IsOptional } from 'class-validator';

export class CreatePermissionDto {
	@IsString()
	@Length(1, 100)
	resource: string;

	@IsString()
	@Length(1, 50)
	action: string;

	@IsOptional()
	@IsString()
	description?: string;
}
