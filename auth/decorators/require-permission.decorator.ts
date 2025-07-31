import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../guards/permission.guard';

export function RequirePermission(resource: string, action: string) {
	return applyDecorators(SetMetadata('requiredPermission', { resource, action }), UseGuards(PermissionGuard));
}
