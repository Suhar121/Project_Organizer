# Dev Dashboard

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Frontend: Vue 3](https://img.shields.io/badge/frontend-Vue%203-42b883)](https://vuejs.org/)
[![Backend: Express](https://img.shields.io/badge/backend-Express-111111)](https://expressjs.com/)

Dev Dashboard is a local-first project launcher for developers who work across many repositories.
It gives you one place to organize projects, run saved commands, track activity, and manage local notes/secrets.

## Highlights

- Project library with tags, pinning, and edit dialogs
- Bulk add projects from a parent folder (with scan + select)
- Grouped/collapsible project sections
- Saved per-project commands with working-directory support
- Live command log panel with re-attach + explicit kill
- Activity feed, notes page, draggable todo board, encrypted vault
- Zero cloud dependency: data stored locally in JSON files

## Tech Stack

- Frontend: Vue 3, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Storage: local JSON files (`backend/projects.json`, `backend/activity-log.json`)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Start backend

```bash
cd backend
npm start
```

Backend default URL: `http://localhost:6001`

### 3. Start frontend

```bash
cd frontend
npm run dev
```

Frontend default URL: `http://localhost:5173`

### Windows helper

`start-dashboard.bat` can launch backend + frontend together (Windows).

## Repository Layout

```text
.
|- backend/      # Express API + local JSON storage
|- frontend/     # Vue app
|- start-dashboard.bat
`- README.md
```

## Development Workflow

```bash
# frontend build check
cd frontend && npm run build

# backend syntax check
cd backend && node --check server.js
```

## Data and Privacy

- This project is designed for local use.
- Vault data is encrypted in-browser before being stored locally.
- Do not commit personal/local runtime data files to Git.

## Contributing

Contributions are welcome. Please read `CONTRIBUTING.md` first.

By participating, you agree to follow `CODE_OF_CONDUCT.md`.

## Security

Please report vulnerabilities according to `SECURITY.md`.

## License

MIT - see `LICENSE`.

## Recent Updates

- **UI/UX Refinements**: Introduced custom scrollbars and viewport bounds for large dialogs (like the Edit Project Dialog).
- **Multiple Saved Commands**: Updated Project Cards to display and execute multiple custom play buttons dynamically.
- **Design & Theming Fixes**: Restored missing Tailwind theme variables \--color-error\ and text map bindings across textarea inputs to solve visual blindspots.
- **TypeScript Stability**: Eliminated blocking Vue-TSC compiling errors and strict linter exceptions causing blank viewport rendering.

