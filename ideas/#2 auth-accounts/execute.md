# Auth-Accounts Execution Plan

## Overview
Implement a comprehensive user management and role-based authorization system that extends the existing wallet-based authentication. This execution plan provides detailed todos organized by implementation phases.

## Phase 1: Database & User Management (16 tasks)

### 1.1 Database Schema Setup
- [ ] **Setup Prisma Schema**: Add users table with wallet_address, username, email, timestamps
- [ ] **Add Roles Table**: Create roles table with name, description, is_system flag
- [ ] **Add User Roles Junction**: Create user_roles table with expiration and audit fields
- [ ] **Add Permissions Table**: Create permissions table with resource and action columns
- [ ] **Add Role Permissions Junction**: Create role_permissions many-to-many table
- [ ] **Create Database Migration**: Generate and run Prisma migration for new schema
- [ ] **Add Database Indexes**: Create indexes for wallet_address, role lookups, and permissions
- [ ] **Seed Default Roles**: Create system roles (admin, user, moderator) with initial permissions

### 1.2 User Service Implementation
- [ ] **Create User Service**: Implement UserService with dependency injection and Prisma integration
- [ ] **Add User CRUD Operations**: Implement createUser, getUserByWallet, updateProfile methods
- [ ] **Add Role Management Methods**: Implement assignRole, removeRole, getUserRoles methods
- [ ] **Add Wallet Address Validation**: Normalize and validate Ethereum wallet addresses
- [ ] **Add User Profile Updates**: Implement updateProfile, updateLastLogin methods
- [ ] **Add User Query Methods**: Implement getAllUsers, getUserById for admin functions

### 1.3 Enhanced Auth Service Integration
- [ ] **Update Auth Service**: Import UserService and integrate user creation on sign-in
- [ ] **Modify SignIn Flow**: Auto-create users on first wallet sign-in, update last login
- [ ] **Update JWT Payload**: Include userId and username in JWT tokens
- [ ] **Add User Creation Logic**: Handle user creation with proper error handling and validation

## Phase 2: Role & Permission System (12 tasks)

### 2.1 Role Service Implementation
- [ ] **Create Role Service**: Implement RoleService with permission management
- [ ] **Add Role CRUD Operations**: Implement createRole, getAllRoles, deleteRole methods
- [ ] **Add Permission Management**: Implement assignPermissionToRole, removePermissionFromRole
- [ ] **Add Permission Checking**: Implement hasPermission, hasRole validation methods
- [ ] **Add Role Validation**: Validate role assignments and prevent circular dependencies

### 2.2 Authorization Guards
- [ ] **Create Role Guard**: Implement RoleGuard with Reflector and role metadata checking
- [ ] **Create Permission Guard**: Implement PermissionGuard with resource/action validation
- [ ] **Add Guard Error Handling**: Proper error responses for unauthorized access
- [ ] **Add Role Expiration Logic**: Check and handle expired role assignments

### 2.3 Authorization Decorators
- [ ] **Create RequireRole Decorator**: Implement @RequireRole decorator with metadata setting
- [ ] **Create RequirePermission Decorator**: Implement @RequirePermission with resource/action params
- [ ] **Add Decorator Composition**: Allow combining multiple authorization requirements
- [ ] **Add Decorator Documentation**: Add JSDoc comments and usage examples

## Phase 3: API Controllers (10 tasks)

### 3.1 User Management Controller
- [ ] **Create Users Controller**: Implement UsersController with profile and admin endpoints
- [ ] **Add Profile Endpoints**: Implement GET/PUT /users/profile for user self-management
- [ ] **Add Admin User Endpoints**: Implement GET /users, GET /users/:id with admin role protection
- [ ] **Add User DTOs**: Create UpdateProfileDto, CreateUserDto with validation

### 3.2 Role Management Controller
- [ ] **Create Roles Controller**: Implement RolesController with role and assignment management
- [ ] **Add Role CRUD Endpoints**: Implement POST/GET /roles with admin protection
- [ ] **Add Role Assignment Endpoints**: Implement POST/DELETE /roles/users/:userId/roles
- [ ] **Add Role DTOs**: Create CreateRoleDto, AssignRoleDto with proper validation

### 3.3 Error Handling & Validation
- [ ] **Add Global Exception Filters**: Handle authorization errors with proper HTTP responses
- [ ] **Add Input Validation**: Use class-validator for all DTOs and request bodies

## Phase 4: Testing & Optimization (8 tasks)

### 4.1 Unit Testing
- [ ] **Test User Service**: Write comprehensive unit tests for UserService methods
- [ ] **Test Role Service**: Write unit tests for RoleService and permission logic
- [ ] **Test Auth Guards**: Write tests for RoleGuard and PermissionGuard functionality
- [ ] **Test Controllers**: Write unit tests for UsersController and RolesController

### 4.2 Integration Testing
- [ ] **Test Auth Flow**: Write integration tests for complete authentication and authorization
- [ ] **Test Role Assignment**: Test role assignment and permission checking end-to-end

### 4.3 Performance & Security
- [ ] **Implement Permission Caching**: Add Redis/memory caching for role and permission lookups
- [ ] **Add Security Audit**: Implement audit logging for all role changes and sensitive operations

## Module Integration Tasks

### Module Setup
- [ ] **Create User Module**: Set up UserModule with proper exports and imports
- [ ] **Create Role Module**: Set up RoleModule with service and controller exports
- [ ] **Update Auth Module**: Integrate UserModule and RoleModule into AuthModule
- [ ] **Update Root Module**: Import new modules into ApiModule

### Type Definitions
- [ ] **Create User Types**: Define User, UserRole interfaces matching Prisma schema
- [ ] **Create Role Types**: Define Role, Permission, UserRole types with proper relationships
- [ ] **Update Auth Types**: Extend AuthPayload to include userId and username
- [ ] **Export Public Types**: Create index files for type exports

## Environment & Configuration

### Environment Variables
- [ ] **Document New Env Vars**: Add any new configuration variables to .env.example
- [ ] **Update Config Service**: Add role and permission related configuration options

### Database Configuration
- [ ] **Update Database Module**: Ensure Prisma client includes new models
- [ ] **Test Database Connections**: Verify all new queries work with both primary and fallback databases

## Documentation & Examples

### API Documentation
- [ ] **Update Swagger Docs**: Add OpenAPI decorators to all new endpoints
- [ ] **Add Usage Examples**: Create example requests and responses for role management
- [ ] **Update CLAUDE.md**: Document new authentication and authorization features

### Code Examples
- [ ] **Add Controller Examples**: Show usage of @RequireRole and @RequirePermission decorators
- [ ] **Add Service Examples**: Demonstrate user and role management in service layer

## Success Criteria Checklist

- [ ] **Zero Breaking Changes**: Existing authentication flow continues to work unchanged
- [ ] **Auto User Creation**: Users are automatically created on first wallet sign-in
- [ ] **Role-Based Authorization**: Controllers can use @RequireRole decorator for protection
- [ ] **Permission-Based Authorization**: Controllers can use @RequirePermission for fine-grained control
- [ ] **Admin Role Management**: Admins can assign/remove roles through API endpoints
- [ ] **User Profile Management**: Users can view and update their own profiles
- [ ] **Audit Trail**: All role changes are logged with timestamps and grantedBy tracking
- [ ] **Performance**: Role checks are optimized with caching for high-traffic endpoints
- [ ] **Type Safety**: All operations are fully typed with Prisma-generated types
- [ ] **Comprehensive Testing**: Full test coverage for all authorization logic

## Implementation Notes

### Design Principles
- **Backward Compatibility**: All existing auth endpoints continue to work
- **Auto Migration**: Users are created automatically on first sign-in
- **Flexible Permissions**: Support both role-based and permission-based authorization
- **Audit First**: All authorization changes are logged for security

### Key Considerations
- **Database Performance**: Indexes on frequently queried columns (wallet_address, user_id, role_id)
- **Caching Strategy**: Permission lookups cached to avoid repeated database queries
- **Role Expiration**: Support for temporary role assignments with expiration dates
- **Security**: Input validation, rate limiting, and audit logging for all sensitive operations

### Testing Strategy
- **Unit Tests**: Focus on business logic in services and guards
- **Integration Tests**: Test complete auth flows from API to database
- **Performance Tests**: Ensure role checking doesn't impact API response times
- **Security Tests**: Verify authorization bypasses are impossible

## Timeline Estimate
- **Phase 1**: 1-2 weeks (Database setup and user management)
- **Phase 2**: 1 week (Role and permission system)
- **Phase 3**: 1 week (API controllers and DTOs)
- **Phase 4**: 1 week (Testing and optimization)

**Total Estimated Time**: 4-5 weeks for complete implementation