# Accounts & Authorization System

## Overview
Implement a comprehensive user management and role-based authorization system with blockchain wallet integration and flexible permission controls.

## Core Objectives
- **User Management**: Secure account creation and management with wallet addresses
- **Role-Based Access Control**: Flexible permission system with multiple roles per user
- **Blockchain Integration**: Native support for wallet-based authentication
- **Security**: Robust authorization with audit trails
- **Scalability**: Efficient role checking and permission caching

## Architecture Design

### 1. Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL, -- Ethereum address format
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP
);
```

#### Roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB, -- Flexible permission structure
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### User Roles Table (Many-to-Many)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP, -- Optional role expiration
  UNIQUE(user_id, role_id)
);
```

### 2. TypeScript Interfaces

```typescript
interface User {
  id: string;
  walletAddress: string;
  username?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  roles: UserRole[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
}

interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  grantedAt: Date;
  grantedBy?: string;
  expiresAt?: Date;
  role: Role;
}

interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  conditions?: Record<string, any>;
}
```

### 3. Authorization Decorator

```typescript
// @RequireRole decorator
export function RequireRole(roleName: string, options?: {
  requireAll?: boolean; // For multiple roles
  resource?: string;
  action?: string;
}) {
  return applyDecorators(
    SetMetadata('requiredRole', { roleName, ...options }),
    UseGuards(RoleGuard)
  );
}

// @RequirePermission decorator
export function RequirePermission(resource: string, action: string) {
  return applyDecorators(
    SetMetadata('requiredPermission', { resource, action }),
    UseGuards(PermissionGuard)
  );
}
```

### 4. Guard Implementation

```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
    private roleService: RoleService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From JWT auth guard
    
    if (!user) return false;

    const roleMetadata = this.reflector.get('requiredRole', context.getHandler());
    if (!roleMetadata) return true;

    const userRoles = await this.userService.getUserRoles(user.id);
    return this.roleService.hasRole(userRoles, roleMetadata.roleName);
  }
}
```

## Implementation Phases

### Phase 1: Core User Management
1. Create user schema and migration
2. Implement user service with CRUD operations
3. Add wallet address validation and normalization
4. Create user authentication endpoints

### Phase 2: Role System
1. Implement role schema and relationships
2. Create role service with permission management
3. Add role assignment and revocation endpoints
4. Implement role-based authorization guards

### Phase 3: Permission System
1. Design flexible permission structure
2. Implement permission checking logic
3. Add resource-based authorization
4. Create permission management endpoints

### Phase 4: Security & Optimization
1. Add audit logging for role changes
2. Implement permission caching
3. Add role expiration handling
4. Create comprehensive testing suite

## API Endpoints

### User Management
- `POST /auth/register` - Register new user with wallet
- `GET /auth/profile` - Get current user profile
- `PUT /auth/profile` - Update user profile
- `GET /auth/users` - List users (admin only)
- `GET /auth/users/:id` - Get user details

### Role Management
- `POST /auth/roles` - Create new role
- `GET /auth/roles` - List all roles
- `POST /auth/users/:id/roles` - Assign role to user
- `DELETE /auth/users/:id/roles/:roleId` - Remove role from user
- `GET /auth/users/:id/roles` - Get user's roles

### Permission Management
- `POST /auth/permissions` - Create permission
- `GET /auth/permissions` - List permissions
- `POST /auth/roles/:id/permissions` - Add permission to role
- `DELETE /auth/roles/:id/permissions/:permissionId` - Remove permission

## Usage Examples

### Controller with Role Protection
```typescript
@Controller('admin')
export class AdminController {
  @Get('users')
  @RequireRole('admin')
  async getUsers() {
    return this.userService.findAll();
  }

  @Post('users/:id/roles')
  @RequireRole('admin')
  async assignRole(@Param('id') userId: string, @Body() roleData: AssignRoleDto) {
    return this.userService.assignRole(userId, roleData.roleId);
  }
}
```

### Controller with Permission Protection
```typescript
@Controller('posts')
export class PostController {
  @Post()
  @RequirePermission('posts', 'create')
  async createPost(@Body() createPostDto: CreatePostDto) {
    return this.postService.create(createPostDto);
  }

  @Put(':id')
  @RequirePermission('posts', 'update')
  async updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postService.update(id, updatePostDto);
  }
}
```

## Technical Requirements

### Dependencies
- `@nestjs/jwt` - JWT authentication
- `ethers` - Ethereum wallet validation
- `class-validator` - DTO validation
- `class-transformer` - Object transformation

### Environment Variables
```bash
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
WALLET_SIGNATURE_EXPIRES_IN=5m
```

### Security Considerations
- Wallet signature verification for authentication
- Role-based access control with fine-grained permissions
- Audit logging for all authorization changes
- Rate limiting on authentication endpoints
- Input validation and sanitization

## Success Criteria
- ✅ Secure user registration with wallet addresses
- ✅ Flexible role-based authorization system
- ✅ Multiple roles per user with expiration support
- ✅ Resource-level permission controls
- ✅ Comprehensive audit logging
- ✅ High-performance role checking with caching
- ✅ Type-safe authorization decorators
- ✅ Easy-to-use permission management 