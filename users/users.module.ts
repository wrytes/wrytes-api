import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../database/database.module';
import { RolesModule } from '../roles/roles.module';

@Module({
	imports: [DatabaseModule, forwardRef(() => RolesModule)],
	providers: [UserService],
	controllers: [UsersController],
	exports: [UserService],
})
export class UsersModule {}
