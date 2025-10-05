# Contributing Guide

Thanks for contributing! This guide helps changes ship smoothly.

## Branching & Workflow
- Branch from `main`: `feature/<name>`, `bugfix/<name>`, `chore/<name>`
- Keep branches small and focused
- Rebase against `main` before opening a PR

## Setup
```bash
npm install
npm run dev
npm test
npm run lint
```

## Commit Messages (Conventional Commits)
- `feat(auth): add refresh token`
- `fix(api): correct validation status code`
- `docs(readme): add setup section`
- `refactor(users): simplify repository`
- `perf(db): add index for email lookup`
- `test(users): cover pagination edge cases`
- `chore(ci): add workflow badge`

## Pull Requests
- Fill a clear description and context
- Link issues if applicable
- Add tests for non-trivial changes
- Update docs (`README.md`, `API.md`) when needed

## Code Quality
- Prefer early returns; avoid deep nesting
- No empty catch blocks; handle errors meaningfully
- Keep functions small and cohesive

## Reviews & Merging
- Maintainers review within 1–3 business days
- Squash or merge commits depending on size; keep meaningful history

## Releases
- Semantic Versioning
- Update `CHANGELOG.md`
- Tag with `vX.Y.Z`


