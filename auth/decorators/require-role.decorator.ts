import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { RoleGuard } from '../guards/role.guard';

export function RequireRole(roleName: string) {
	return applyDecorators(SetMetadata('requiredRole', roleName), UseGuards(RoleGuard));
}
