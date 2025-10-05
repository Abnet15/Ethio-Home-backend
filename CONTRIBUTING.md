# Contributing Guide

## Workflow
1. Create a branch from `main`: feature/<name> or bugfix/<name>
2. Write code + tests
3. Run lint and tests: `npm run lint`, `npm test`
4. Open a PR with a clear description

## Commit Messages (Conventional Commits)
- feat(scope): ...
- fix(scope): ...
- docs(scope): ...
- refactor(scope): ...
- perf(scope): ...
- test(scope): ...
- chore(scope): ...

## Code Style
- Keep functions small and readable
- Prefer early returns, avoid deep nesting
- Don’t swallow errors; handle meaningfully

## PR Checklist
- [ ] Tests added/updated
- [ ] Lint passes
- [ ] Docs updated if needed


