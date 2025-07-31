import { Module, forwardRef } from '@nestjs/common';
import { RoleService } from './roles.service';
import { RolesController, PermissionsController } from './roles.controller';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';

@Module({
	imports: [DatabaseModule, forwardRef(() => UsersModule)],
	providers: [RoleService],
	controllers: [RolesController, PermissionsController],
	exports: [RoleService],
})
export class RolesModule {}
