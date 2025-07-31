# Accounts & Authorization Implementation Plan

## Analysis of Current Auth Module

### Current Architecture
- **Wallet-based authentication** using signature verification
- **JWT tokens** for session management
- **Global auth guard** with `@Public()` decorator for bypass
- **Native NestJS tools** (no Passport.js dependency)
- **Viem integration** for Ethereum wallet operations

### Existing Components
- `AuthService` - Message creation and signature verification
- `AuthGuard` - Global JWT verification with cookie/header support
- `WalletService` - Signature verification and JWT secret management
- `@Public()` decorator - Route bypass mechanism

## Implementation Strategy

### Phase 1: Database Integration & User Management

#### 1.1 Database Schema Setup
```sql
-- Users table (extends current auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  profile_data JSONB DEFAULT '{}'
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  UNIQUE(user_id, role_id)
);

-- Permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(resource, action)
);

-- Role permissions junction table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

#### 1.2 User Service Implementation
```typescript
// users/users.service.ts
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService
  ) {}

  async createUser(walletAddress: string, username?: string, email?: string): Promise<User> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    return this.prisma.user.create({
      data: {
        walletAddress: normalizedAddress,
        username,
        email,
        isActive: true
      }
    });
  }

  async getUserByWallet(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { userRoles: { include: { role: { include: { permissions: true } } } } }
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() }
    });
  }

  async assignRole(userId: string, roleId: string, grantedBy?: string): Promise<UserRole> {
    return this.prisma.userRole.create({
      data: {
        userId,
        roleId,
        grantedBy
      },
      include: { role: true }
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId }
      }
    });
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: { 
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { role: { include: { permissions: true } } }
    });
  }
}
```

#### 1.3 Enhanced Auth Service
```typescript
// auth/auth.service.ts (extended)
@Injectable()
export class AuthService {
  constructor(
    private readonly wallet: WalletService,
    private jwtService: JwtService,
    private userService: UserService
  ) {}

  // ... existing methods ...

  async signIn({ message, signature }: SignInOptions): Promise<AuthAccessToken | { error: string }> {
    // ... existing signature verification ...

    const user = await this.userService.getUserByWallet(input.address);
    
    if (!user) {
      // Auto-create user on first sign-in
      const newUser = await this.userService.createUser(input.address);
      await this.userService.updateLastLogin(newUser.id);
      return this.signPayload({ 
        address: input.address, 
        userId: newUser.id,
        username: newUser.username 
      });
    }

    await this.userService.updateLastLogin(user.id);
    return this.signPayload({ 
      address: input.address, 
      userId: user.id,
      username: user.username 
    });
  }

  private async signPayload(payload: AuthPayload): Promise<AuthAccessToken> {
    return {
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
```

### Phase 2: Role & Permission System

#### 2.1 Role Service
```typescript
// roles/roles.service.ts
@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  async createRole(name: string, description?: string): Promise<Role> {
    return this.prisma.role.create({
      data: { name, description }
    });
  }

  async assignPermissionToRole(roleId: string, resource: string, action: string): Promise<void> {
    let permission = await this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } }
    });

    if (!permission) {
      permission = await this.prisma.permission.create({
        data: { resource, action }
      });
    }

    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: permission.id
      }
    });
  }

  async hasPermission(userRoles: UserRole[], resource: string, action: string): Promise<boolean> {
    for (const userRole of userRoles) {
      const hasPermission = userRole.role.permissions.some(
        permission => permission.resource === resource && permission.action === action
      );
      if (hasPermission) return true;
    }
    return false;
  }

  async hasRole(userRoles: UserRole[], roleName: string): Promise<boolean> {
    return userRoles.some(userRole => userRole.role.name === roleName);
  }
}
```

#### 2.2 Authorization Guards
```typescript
// auth/guards/role.guard.ts
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
    private roleService: RoleService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user?.userId) return false;

    const roleMetadata = this.reflector.get('requiredRole', context.getHandler());
    if (!roleMetadata) return true;

    const userRoles = await this.userService.getUserRoles(user.userId);
    return this.roleService.hasRole(userRoles, roleMetadata.roleName);
  }
}

// auth/guards/permission.guard.ts
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
    private roleService: RoleService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user?.userId) return false;

    const permissionMetadata = this.reflector.get('requiredPermission', context.getHandler());
    if (!permissionMetadata) return true;

    const userRoles = await this.userService.getUserRoles(user.userId);
    return this.roleService.hasPermission(
      userRoles, 
      permissionMetadata.resource, 
      permissionMetadata.action
    );
  }
}
```

#### 2.3 Authorization Decorators
```typescript
// auth/decorators/require-role.decorator.ts
export function RequireRole(roleName: string) {
  return applyDecorators(
    SetMetadata('requiredRole', { roleName }),
    UseGuards(RoleGuard)
  );
}

// auth/decorators/require-permission.decorator.ts
export function RequirePermission(resource: string, action: string) {
  return applyDecorators(
    SetMetadata('requiredPermission', { resource, action }),
    UseGuards(PermissionGuard)
  );
}
```

### Phase 3: API Controllers

#### 3.1 User Management Controller
```typescript
// users/users.controller.ts
@Controller('users')
export class UsersController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.userService.getUserByWallet(req.user.address);
    return user;
  }

  @Put('profile')
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.userService.updateProfile(req.user.userId, updateDto);
  }

  @Get()
  @RequireRole('admin')
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  @RequireRole('admin')
  async getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }
}
```

#### 3.2 Role Management Controller
```typescript
// roles/roles.controller.ts
@Controller('roles')
export class RolesController {
  constructor(
    private roleService: RoleService,
    private userService: UserService
  ) {}

  @Post()
  @RequireRole('admin')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.createRole(createRoleDto.name, createRoleDto.description);
  }

  @Get()
  async getAllRoles() {
    return this.roleService.getAllRoles();
  }

  @Post('users/:userId/roles')
  @RequireRole('admin')
  async assignRole(
    @Param('userId') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @Request() req
  ) {
    return this.userService.assignRole(userId, assignRoleDto.roleId, req.user.userId);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequireRole('admin')
  async removeRole(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    await this.userService.removeRole(userId, roleId);
    return { success: true };
  }
}
```

### Phase 4: Enhanced Types & DTOs

#### 4.1 Extended Auth Types
```typescript
// auth/auth.types.ts (extended)
export type AuthPayload = {
  address: Address;
  userId: string;
  username?: string;
};

export type CreateUserDto = {
  walletAddress: string;
  username?: string;
  email?: string;
};

export type UpdateProfileDto = {
  username?: string;
  email?: string;
  profileData?: Record<string, any>;
};
```

#### 4.2 Role & Permission DTOs
```typescript
// roles/dtos/create-role.dto.ts
export class CreateRoleDto {
  @IsString()
  @Length(1, 50)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// roles/dtos/assign-role.dto.ts
export class AssignRoleDto {
  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsDate()
  expiresAt?: Date;
}
```

### Phase 5: Module Integration

#### 5.1 Updated Auth Module
```typescript
// auth/auth.module.ts (extended)
@Module({
  imports: [
    WalletModule,
    UserModule,
    RoleModule,
    JwtModule.registerAsync({
      global: true,
      imports: [WalletModule],
      inject: [WalletService],
      useFactory: async (wallet: WalletService) => ({
        secret: wallet.getJwtSecret(),
        signOptions: { expiresIn: '4h' },
      }),
    }),
  ],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

#### 5.2 User Module
```typescript
// users/users.module.ts
@Module({
  imports: [PrismaModule],
  providers: [UserService],
  controllers: [UsersController],
  exports: [UserService],
})
export class UserModule {}
```

#### 5.3 Role Module
```typescript
// roles/roles.module.ts
@Module({
  imports: [PrismaModule],
  providers: [RoleService],
  controllers: [RolesController],
  exports: [RoleService],
})
export class RoleModule {}
```

## Implementation Timeline

### Week 1: Database & Core Services
- [ ] Set up Prisma schema with users, roles, permissions tables
- [ ] Implement UserService with CRUD operations
- [ ] Extend AuthService to create users on first sign-in
- [ ] Update JWT payload to include userId

### Week 2: Role System
- [ ] Implement RoleService with permission management
- [ ] Create RoleGuard and PermissionGuard
- [ ] Add @RequireRole and @RequirePermission decorators
- [ ] Implement role assignment/removal logic

### Week 3: API Controllers
- [ ] Create UsersController with profile management
- [ ] Implement RolesController for role management
- [ ] Add comprehensive DTOs and validation
- [ ] Implement audit logging for role changes

### Week 4: Testing & Optimization
- [ ] Add comprehensive unit tests
- [ ] Implement permission caching
- [ ] Add role expiration handling
- [ ] Performance optimization and monitoring

## Key Design Decisions

### 1. Auto-User Creation
- Users are automatically created on first wallet sign-in
- No separate registration endpoint needed
- Maintains existing auth flow

### 2. Role-Based with Permission Granularity
- Roles provide logical grouping
- Permissions provide fine-grained control
- Supports both role-based and permission-based authorization

### 3. Native NestJS Approach
- No Passport.js dependency
- Uses built-in guards and decorators
- Leverages existing JWT and wallet verification

### 4. Audit Trail
- All role assignments tracked with grantedBy and timestamp
- Role expiration support for temporary access
- Comprehensive logging for security events

## Success Metrics
- ✅ Seamless integration with existing auth flow
- ✅ Zero breaking changes to current authentication
- ✅ Type-safe authorization with decorators
- ✅ Flexible role and permission system
- ✅ Comprehensive audit logging
- ✅ High performance with caching
- ✅ Easy-to-use API for role management 