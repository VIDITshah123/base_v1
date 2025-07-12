# EmployDEX - Data Flow Diagram (DFD)

## Level 0 (Context Diagram)

```mermaid
graph TD
    subgraph "EmployDEX System"
        A[User] -->|Login/Register| B[Authentication]
        B -->|JWT Token| A
        A -->|Manage Profile| C[User Management]
        A -->|View/Manage Users| D[Admin Dashboard]
        A -->|Manage Roles & Permissions| E[Role Management]
        
        B -->|Authenticate| F[(Database)]
        C -->|CRUD Operations| F
        D -->|User Management| F
        E -->|Role/Permission Management| F
    end
```

## Level 1 (Main Processes)

```mermaid
graph TD
    subgraph "Authentication Flow"
        A1[User] -->|1. Login Credentials| A2[Login Process]
        A2 -->|2. Validate Credentials| A3[Database]
        A3 -->|3. User Data| A2
        A2 -->|4. JWT Token| A1
        A1 -->|5. Register| A4[Registration Process]
        A4 -->|6. Create User| A3
    end

    subgraph "User Management"
        B1[Authenticated User] -->|1. View/Edit Profile| B2[Profile Management]
        B1 -->|2. Change Password| B3[Password Management]
        B2 -->|3. Update Data| A3
        B3 -->|4. Update Password| A3
    end

    subgraph "Admin Functions"
        C1[Admin User] -->|1. Manage Users| C2[User Administration]
        C1 -->|2. Manage Roles| C3[Role Management]
        C1 -->|3. Manage Permissions| C4[Permission Management]
        C2 -->|4. CRUD Operations| A3
        C3 -->|5. Assign Roles| A3
        C4 -->|6. Assign Permissions| A3
    end
```

## Key Data Stores

1. **Users**
   - User credentials (hashed passwords)
   - Profile information
   - Account status

2. **Roles**
   - Role definitions
   - Role assignments

3. **Permissions**
   - Permission definitions
   - Permission assignments to roles

4. **Activity Logs**
   - User actions
   - System events
   - Security events

## External Entities

1. **Users**
   - Regular users
   - Admin users
   - System administrators

2. **External Services** (potential future integration)
   - Email service
   - File storage
   - Third-party authentication

## Data Flows

1. **Authentication**
   - Credentials → System → Validation → JWT Token
   - Registration Data → System → User Creation → Confirmation

2. **User Management**
   - Profile Updates → System → Database
   - Password Changes → System → Database (hashed)

3. **Administration**
   - User Management Commands → System → Database Updates
   - Role/Permission Changes → System → Database Updates

## Security Controls

1. **Authentication**
   - JWT-based authentication
   - Password hashing (bcrypt)
   - Token expiration

2. **Authorization**
   - Role-based access control (RBAC)
   - Permission checks for sensitive operations
   - Input validation

3. **Audit**
   - Activity logging
   - Security event monitoring

## Notes

- All sensitive data is encrypted in transit (HTTPS) and at rest
- API endpoints are protected with JWT authentication
- Admin functions require appropriate role-based permissions
- User sessions are managed using JWT tokens with expiration
