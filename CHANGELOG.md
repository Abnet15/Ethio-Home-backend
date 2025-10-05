# Changelog

All notable changes to this project will be documented here.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [1.0.1] - 2025-10-05
### Fixed
- cors: correct allowed origins and credentials for production

## [1.0.0] - 2025-10-03
### Added
- core: healthcheck, centralized error handling
- auth: register/login with JWT
- users: CRUD, pagination/sorting
- properties: CRUD and validation
- security: helmet, rate limiting, cors
- devops: docker-compose (local), CI workflow
- docs: README, API reference, contributing, security policy, CoC

### Changed
- refactor: reorganize modules and improve dependency layout
- perf: add indexes and optimize heavy queries
