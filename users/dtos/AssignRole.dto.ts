import { IsUUID, IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class AssignRoleDto {
	@IsUUID()
	roleId: string;

	@IsOptional()
	@IsDateString()
	@Transform(({ value }) => (value ? new Date(value) : undefined))
	expiresAt?: Date;
}
