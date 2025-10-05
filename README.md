# Ethio Home Backend

Production-ready backend API built with Node.js and Express.

## Overview
- JWT authentication with secure cookie/Bearer support
- REST endpoints: users, properties, reviews, messages, notifications
- Centralized validation and error handling
- Security: Helmet, CORS, rate limiting, sanitization
- Structured logging, healthcheck, CI-ready

## Requirements
- Node.js >= 18 (LTS)
- npm >= 9
- Docker (optional for DB/services)

## Quickstart
```bash
npm install
# copy and adjust environment (see below)
cp config.env config.env.local  # or create a new file

# development
npm run dev

# production
npm run build  # if TS/transpile is used in your setup
npm start
```

## Environment
Key variables used by the server.

| Name | Example | Description |
|---|---|---|
| PORT | 4000 | HTTP port |
| NODE_ENV | development | Runtime environment |
| JWT_SECRET | change-me | Secret for signing JWTs |
| JWT_EXPIRES_IN | 1d | Token TTL (e.g., 15m, 1d) |
| CORS_ORIGIN | http://localhost:3000 | Allowed frontend origin |
| RATE_LIMIT_WINDOW_MS | 60000 | Rate limit window in ms |
| RATE_LIMIT_MAX | 100 | Max requests per window |

Store secrets securely; never commit them to version control.

## Scripts
- `npm run dev` — start dev server (auto-reload)
- `npm start` — start production server
- `npm run build` — build/transpile (if applicable)
- `npm test` — run tests (if configured)
- `npm run lint` — lint codebase

## API
See `API.md` for full reference and examples.

Healthcheck:
```http
GET /health 200 OK
{ "status": "ok" }
```

## Project Structure
```
backend/
  controllers/      # route handlers
  models/           # DB schemas/models
  routes/           # express routers
  services/         # domain services
  utils/            # helpers (errors, email, etc.)
  views/            # templates (e.g., email)
  server.js         # app bootstrap
```

## Error Handling
- Central middleware normalizes responses: `{ message, code?, details? }`
- Validation errors return 400 with field details
- Unhandled errors are logged with correlation ids where applicable

## Security
- Helmet, CORS, rate limiting enabled
- Input validation/sanitization in controllers and middleware
- JWT secret and credentials in env variables only

## Logging
- Request logging (e.g., morgan/pino-http)
- Structured app logs for debugging and ops

## Troubleshooting
- Port in use: set `PORT` or free the port
- CORS errors: confirm `CORS_ORIGIN` matches client URL
- 401/403: verify token presence/expiry and JWT secret
- Email sending issues: check SMTP creds (if enabled) and network

## Contributing & Security
- See `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`
- Report vulnerabilities via `SECURITY.md`

## Changelog
- See `CHANGELOG.md` for release notes


