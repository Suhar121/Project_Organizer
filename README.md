# Dev Dashboard

A local developer dashboard consisting of a Vue 3/Vite frontend and a Node.js/Express backend. This application allows you to manage and launch your local development projects from a single unified interface.

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

## Project Structure

- `frontend/`: Vue 3, Vite, Tailwind CSS, Vue Router client application.
- `backend/`: Node.js, Express backend that stores data in a local `projects.json`.

## Getting Started

### 1. Start the Backend

The backend runs on port 6001 by default.

```bash
cd backend
npm install
node server.js
```

### 2. Start the Frontend

The frontend development server runs using Vite.

```bash
cd frontend
npm install
npm run dev
```

Open your browser and navigate to the URL provided by Vite (typically `http://localhost:5173`).

## Features

- View locally configured projects
- Add new projects with custom metadata
- Launch projects via custom commands
- Simple JSON-based database (`projects.json`) for easy backup and editing

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -am 'Add an awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

## License

MIT License

## Desktop Start icon 
Copy the Start-dashboard.bat code  file and create a file named .bat and then paste the code  in it 
