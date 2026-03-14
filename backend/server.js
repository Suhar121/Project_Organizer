const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 6001;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');

app.use(cors());
app.use(express.json());

// Helper to read projects
function getProjects() {
  if (!fs.existsSync(PROJECTS_FILE)) {
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2));
  }
  const data = fs.readFileSync(PROJECTS_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}

// Helper to write projects
function saveProjects(projects) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));
}

// Get all projects
app.get('/projects', (req, res) => {
  res.json(getProjects());
});

// Add a project
app.post('/projects', (req, res) => {
  const { name, description, path: projectPath, tags } = req.body;
  if (!name || !projectPath) {
    return res.status(400).json({ error: 'Name and path are required' });
  }

  const projects = getProjects();
  const newProject = {
    id: Date.now().toString(),
    name,
    description: description || '',
    path: projectPath,
    tags: tags || [],
    status: 'stopped'
  };

  projects.push(newProject);
  saveProjects(projects);

  res.status(201).json(newProject);
});

// Delete a project
app.delete('/projects/:id', (req, res) => {
  const { id } = req.params;
  let projects = getProjects();
  
  const initialLength = projects.length;
  projects = projects.filter(p => p.id !== id);
  
  if (projects.length === initialLength) {
    return res.status(404).json({ error: 'Project not found' });
  }

  saveProjects(projects);
  res.json({ message: 'Project deleted successfully' });
});

// Run start.ps1
app.post('/run', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Path is required' });

  const scriptPath = path.join(projectPath, 'start.ps1');

  // We are creating an async execution to not block if start.ps1 runs a server
  const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
  console.log(`Execution command: ${command}`);

  exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running start.ps1: ${error}`);
      return;
    }
  });

  res.json({ message: 'Project script started in background.' });
});

// Open VS Code
app.post('/open-vscode', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Path is required' });

  exec(`code "${projectPath}"`, { cwd: projectPath }, (error) => {
    if (error) {
       console.error(`Error opening VS Code: ${error}`);
       return res.status(500).json({ error: 'Failed to open VS Code' });
    }
    res.json({ message: 'VS Code opened' });
  });
});

// Open Folder
app.post('/open-folder', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Path is required' });

  exec(`explorer "${projectPath}"`, (error) => {
    if (error) {
       console.error(`Error opening folder: ${error}`);
       return res.status(500).json({ error: 'Failed to open folder' });
    }
    res.json({ message: 'Folder opened' });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
