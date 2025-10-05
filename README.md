# Ethio Home Backend

Backend API service built with Node.js and Express.

## Features
- JWT authentication
- Users, properties, reviews, messages, notifications
- Centralized validation and error handling
- Security (Helmet, rate limiting, CORS)
- Request/app logging

## Prerequisites
- Node.js >= 18, npm >= 9
- Docker (optional for local DB)

## Setup
1) Install dependencies
```bash
npm install
```

2) Environment
Create `config.env` (example keys):
```bash
PORT=4000
NODE_ENV=development
JWT_SECRET=change-me
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000
```

## Run
```bash
npm run dev   # start dev
npm start     # start prod (after build if TS)
```

## Scripts
- `npm run dev`: dev server
- `npm test`: tests (if configured)
- `npm run lint`: lint

## API
See `API.md` for endpoints and examples.

## Project Structure
```
backend/
  controllers/
  models/
  routes/
  services/
  utils/
  views/
  server.js
```

## Security & Contributing
- See `SECURITY.md` to report vulnerabilities.
- See `CONTRIBUTING.md` for guidelines.
- `CODE_OF_CONDUCT.md` applies to all contributors.

## Changelog
See `CHANGELOG.md`.


