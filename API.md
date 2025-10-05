# API Reference

Base URL: `/`
Auth: `Authorization: Bearer <jwt>` unless noted

## Auth
POST /auth/register
- Body: { email, password, name }
- 201 Created: { id, email, name }

POST /auth/login
- Body: { email, password }
- 200 OK: { accessToken }

GET /auth/me
- 200 OK: { id, email, name }

## Users
GET /users
- Query: page, limit, sort

POST /users
- Body: { email, name }

GET /users/:id
PATCH /users/:id
DELETE /users/:id

## Products/Properties
GET /properties
POST /properties
GET /properties/:id
PATCH /properties/:id
DELETE /properties/:id

## Messages/Notifications
GET /messages
POST /messages
GET /notifications

## Errors
Shape: { message, code?, details? }

## Pagination
- page (default 1), limit (default 20, max 100)


