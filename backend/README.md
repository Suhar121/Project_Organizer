# Backend

Express API for Dev Dashboard.

## Scripts

- `npm start` - run API server on `PORT` (default: `6001`)
- `npm run dev` - same as start
- `npm run check` - syntax check (`node --check server.js`)

## API Overview

- `GET /projects`
- `POST /projects`
- `PUT /projects/:id`
- `DELETE /projects/:id`
- `POST /projects/bulk-add`
- `POST /folders/scan`
- `POST /projects/:id/commands/run`
- `GET /projects/:id/commands/stream`
- `POST /projects/:id/commands/kill`
- `GET /system/overview`
- `GET /system/ports`
- `GET /activity`

## Local Data Files

- `projects.json` - project metadata and saved commands
- `activity-log.json` - recent actions

These files are runtime data and should usually stay out of git history.
