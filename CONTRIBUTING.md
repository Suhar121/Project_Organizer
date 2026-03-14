# Contributing to Dev Dashboard

Thanks for helping improve Dev Dashboard.

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
```

3. Start backend:

```bash
cd backend
npm start
```

4. Start frontend:

```bash
cd frontend
npm run dev
```

## Branch Naming

Use descriptive branch names:

- `feat/<short-description>`
- `fix/<short-description>`
- `docs/<short-description>`
- `chore/<short-description>`

## Pull Requests

Before opening a PR:

1. Keep the change focused.
2. Update docs for any user-facing behavior changes.
3. Verify checks:

```bash
cd frontend && npm run build
cd ../backend && npm run check
```

4. Include clear testing notes in the PR.

## Commit Messages

Prefer concise, imperative commit messages.

Examples:

- `feat: add command stream reattach support`
- `fix: prevent duplicate command start`
- `docs: improve quick start instructions`

## Reporting Bugs

Use GitHub Issues with reproduction steps, expected behavior, and actual behavior.

## Code Style

- Keep changes minimal and readable.
- Avoid introducing dependencies unless necessary.
- Preserve existing project conventions.
