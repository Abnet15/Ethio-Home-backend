# API Reference

Base URL: `/`
Authentication: Bearer token via `Authorization: Bearer <jwt>` unless noted.
Content-Type: `application/json`

## Authentication
### POST /auth/register
Request
```json
{ "email": "user@example.com", "password": "secret", "name": "Jane" }
```
Responses
- 201 Created
```json
{ "id": "...", "email": "user@example.com", "name": "Jane" }
```

### POST /auth/login
Request
```json
{ "email": "user@example.com", "password": "secret" }
```
Responses
- 200 OK
```json
{ "accessToken": "<jwt>" }
```

### GET /auth/me
Headers: `Authorization: Bearer <jwt>`
- 200 OK → `{ "id", "email", "name" }`

## Users
### GET /users
Query: `page`, `limit`, `sort`
- 200 OK
```json
{ "data": [ {"id":"...","email":"..."} ], "page":1, "limit":20, "total":123 }
```

### POST /users
Request
```json
{ "email": "a@b.com", "name": "Alice" }
```
- 201 Created → `User`

### GET /users/:id
- 200 OK → `User`

### PATCH /users/:id
Request: partial user fields
- 200 OK → updated `User`

### DELETE /users/:id
- 204 No Content

## Properties
### GET /properties
Query: `q`, `page`, `limit`, `sort`
- 200 OK
```json
{ "data": [ {"id":"...","name":"..."} ], "page":1, "limit":20, "total":42 }
```

### POST /properties
Request
```json
{ "name": "Item", "price": 9.99 }
```
- 201 Created → `Property`

### GET /properties/:id
- 200 OK → `Property`

### PATCH /properties/:id
- 200 OK → `Property`

### DELETE /properties/:id
- 204 No Content

## Messages & Notifications
- `GET /messages`, `POST /messages`
- `GET /notifications`

## Health
- `GET /health` → `{ "status": "ok" }`

## Errors
Unified shape
```json
{ "message": "string", "code": "optional", "details": { "field": "reason" } }
```

## Pagination
- `page` (default 1)
- `limit` (default 20, max 100)
- `total` (overall items)

## Curl Examples
```bash
# Login
curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret"}'

# List users (requires token)
TOKEN=...; curl -s http://localhost:4000/users \
  -H "Authorization: Bearer $TOKEN"
```


