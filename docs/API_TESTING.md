# API Testing Guide

This guide explains how to test the Crossview API endpoints using Postman or similar tools.

## Base URL

```
http://localhost:3001
```

## Authentication

The API uses **session-based authentication** with cookies. You need to:

1. **Login first** to get a session cookie
2. **Include the cookie** in subsequent requests
3. **Use the same cookie** for all authenticated requests

### Postman Cookie Setup

1. After logging in, Postman will automatically capture the session cookie
2. Or manually add it: Go to **Cookies** → Add cookie for `localhost:3001`
3. Cookie name: `connect.sid` (Express session cookie)

## API Endpoints

### Authentication Endpoints

#### 1. Check Authentication Status
```http
GET /api/auth/check
```

**No authentication required**

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  },
  "hasAdmin": true,
  "hasUsers": true
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json
```

**Body:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Note:** This sets a session cookie automatically.

#### 3. Logout
```http
POST /api/auth/logout
```

**Requires authentication**

**Response:**
```json
{
  "success": true
}
```

#### 4. Register (First User Only)
```http
POST /api/auth/register
Content-Type: application/json
```

**Body:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "your-password",
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "crossview",
    "username": "postgres",
    "password": "postgres"
  }
}
```

**Note:** Only works when no users exist in the database.

#### 5. SSO Status
```http
GET /api/auth/sso/status
```

**No authentication required**

**Response:**
```json
{
  "enabled": true,
  "oidc": {
    "enabled": true
  },
  "saml": {
    "enabled": true
  }
}
```

### Configuration Endpoints

#### 6. Get Database Configuration
```http
GET /api/config/database
```

**No authentication required** (only when no users exist)

**Response:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "crossview",
  "username": "postgres",
  "password": ""
}
```

#### 7. Update Database Configuration
```http
POST /api/config/database
Content-Type: application/json
```

**Body:**
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "crossview",
  "username": "postgres",
  "password": "your-password"
}
```

**No authentication required** (only when no users exist)

### User Management Endpoints (Admin Only)

#### 8. Get All Users
```http
GET /api/users
```

**Requires authentication + admin role**

**Response:**
```json
[
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2025-12-04T20:00:00.000Z"
  }
]
```

#### 9. Create User
```http
POST /api/users
Content-Type: application/json
```

**Requires authentication + admin role**

**Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response:**
```json
{
  "id": 2,
  "username": "newuser",
  "email": "user@example.com",
  "role": "user",
  "created_at": "2025-12-04T20:00:00.000Z"
}
```

#### 10. Update User
```http
PUT /api/users/:id
Content-Type: application/json
```

**Requires authentication + admin role**

**Body:**
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "role": "admin"
}
```

### Kubernetes Context Endpoints

#### 11. Get All Contexts
```http
GET /api/contexts
```

**Requires authentication**

**Response:**
```json
[
  "minikube",
  "docker-desktop",
  "production"
]
```

#### 12. Get Current Context
```http
GET /api/contexts/current
```

**Requires authentication**

**Response:**
```json
{
  "context": "minikube"
}
```

#### 13. Set Current Context
```http
POST /api/contexts/current
Content-Type: application/json
```

**Requires authentication**

**Body:**
```json
{
  "context": "minikube"
}
```

### Kubernetes Resource Endpoints

#### 14. Get Namespaces
```http
GET /api/namespaces?context=minikube
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name

**Response:**
```json
[
  {
    "metadata": {
      "name": "default",
      "creationTimestamp": "2025-12-04T20:00:00.000Z"
    }
  }
]
```

#### 15. Get Resources
```http
GET /api/resources?context=minikube&apiVersion=v1&kind=Pod&namespace=default
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name
- `apiVersion` (required): API version (e.g., `v1`, `apps/v1`)
- `kind` (required): Resource kind (e.g., `Pod`, `Deployment`)
- `namespace` (optional): Namespace name (omit for cluster-scoped resources)
- `limit` (optional): Maximum number of items to return
- `continue` (optional): Token for pagination
- `plural` (optional): Custom plural form

**Response:**
```json
{
  "items": [
    {
      "apiVersion": "v1",
      "kind": "Pod",
      "metadata": {
        "name": "my-pod",
        "namespace": "default"
      },
      "spec": {},
      "status": {}
    }
  ],
  "continueToken": null,
  "remainingItemCount": null
}
```

#### 16. Get Single Resource
```http
GET /api/resource?context=minikube&apiVersion=v1&kind=Pod&name=my-pod&namespace=default
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name
- `apiVersion` (required): API version
- `kind` (required): Resource kind
- `name` (required): Resource name
- `namespace` (optional): Namespace name
- `plural` (optional): Custom plural form

**Response:**
```json
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {
    "name": "my-pod",
    "namespace": "default"
  },
  "spec": {},
  "status": {}
}
```

#### 17. Get Resource Events
```http
GET /api/events?context=minikube&kind=Pod&name=my-pod&namespace=default
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name
- `kind` (required): Resource kind
- `name` (required): Resource name
- `namespace` (optional): Namespace name

**Response:**
```json
[
  {
    "type": "Normal",
    "reason": "Scheduled",
    "message": "Successfully assigned default/my-pod to minikube",
    "firstTimestamp": "2025-12-04T20:00:00.000Z",
    "lastTimestamp": "2025-12-04T20:00:00.000Z"
  }
]
```

### Crossplane Endpoints

#### 18. Get Crossplane Resources
```http
GET /api/crossplane/resources?context=minikube&namespace=default
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name
- `namespace` (optional): Namespace name
- `limit` (optional): Maximum number of items
- `continue` (optional): Pagination token

**Response:**
```json
{
  "items": [
    {
      "apiVersion": "apiextensions.crossplane.io/v1",
      "kind": "CompositeResourceDefinition",
      "metadata": {
        "name": "xpostgresqlinstances.database.example.org"
      }
    }
  ],
  "continueToken": null
}
```

#### 19. Get Claims
```http
GET /api/claims?context=minikube&limit=100
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name
- `limit` (optional): Maximum number of items
- `continue` (optional): Pagination token

**Response:**
```json
{
  "items": [
    {
      "apiVersion": "database.example.org/v1alpha1",
      "kind": "PostgreSQLInstance",
      "metadata": {
        "name": "my-database"
      }
    }
  ],
  "continueToken": null
}
```

#### 20. Get Composite Resources
```http
GET /api/composite-resources?context=minikube&limit=100
```

**Requires authentication**

**Query Parameters:**
- `context` (required): Kubernetes context name
- `limit` (optional): Maximum number of items
- `continue` (optional): Pagination token

**Response:**
```json
{
  "items": [
    {
      "apiVersion": "database.example.org/v1alpha1",
      "kind": "XPostgreSQLInstance",
      "metadata": {
        "name": "my-database-abc123"
      }
    }
  ],
  "continueToken": null
}
```

### Health Check

#### 21. Health Check
```http
GET /api/health
```

**No authentication required**

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T20:00:00.000Z"
}
```

**With context check (requires auth):**
```http
GET /api/health?context=minikube
```

**Response:**
```json
{
  "connected": true
}
```

## Postman Collection Setup

### Step 1: Create Environment

1. Create a new environment in Postman
2. Add variables:
   - `base_url`: `http://localhost:3001`
   - `context`: `minikube` (or your Kubernetes context)

### Step 2: Enable Cookie Management

1. Go to **Settings** → **General**
2. Enable **Automatically follow redirects**
3. Go to **Settings** → **Cookies**
4. Enable **Automatically manage cookies**

### Step 3: Create Request Collection

Organize requests by category:
- **Authentication**: Login, Logout, Check Auth
- **Users**: Get Users, Create User, Update User
- **Kubernetes**: Contexts, Namespaces, Resources
- **Crossplane**: Claims, Composite Resources

### Step 4: Test Flow

1. **First Request**: `POST /api/auth/login`
   - This will set the session cookie automatically
   
2. **Subsequent Requests**: Use any authenticated endpoint
   - Postman will automatically include the cookie
   
3. **Verify**: `GET /api/auth/check`
   - Should return `authenticated: true`

## Example Postman Requests

### Login Request
```
Method: POST
URL: {{base_url}}/api/auth/login
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "username": "admin",
  "password": "your-password"
}
```

### Get Resources Request
```
Method: GET
URL: {{base_url}}/api/resources
Query Params:
  context: {{context}}
  apiVersion: v1
  kind: Pod
  namespace: default
```

### Create User Request
```
Method: POST
URL: {{base_url}}/api/users
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "role": "user"
}
```

## Troubleshooting

### 401 Unauthorized
- Make sure you've logged in first
- Check that cookies are enabled in Postman
- Verify the session cookie is being sent

### 403 Forbidden
- Check if you have admin role (for admin-only endpoints)
- Verify your user role in the database

### 400 Bad Request
- Check required query parameters are present
- Verify request body format is correct JSON
- Ensure context parameter is provided for Kubernetes endpoints

### Connection Issues
- Verify server is running on `http://localhost:3001`
- Check CORS settings if testing from different origin
- Ensure database is running and configured

## Tips

1. **Save Session Cookie**: After login, save the cookie value for manual testing
2. **Use Variables**: Store common values (context, namespace) as environment variables
3. **Test Sequence**: Always test login first, then authenticated endpoints
4. **Check Logs**: Server logs show detailed request/response information
5. **Pagination**: Use `continue` token for large result sets

