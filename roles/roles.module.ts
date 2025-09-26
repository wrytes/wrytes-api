import { Module, forwardRef } from '@nestjs/common';
import { RoleService } from './roles.service';
import { RolesController } from './roles.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';

@Module({
	imports: [DatabaseModule, forwardRef(() => UsersModule)],
	providers: [RoleService, PermissionsService],
	controllers: [RolesController, PermissionsController],
	exports: [RoleService],
})
export class RolesModule {}
