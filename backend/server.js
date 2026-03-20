const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 6001;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const ACTIVITY_FILE = path.join(__dirname, 'activity-log.json');

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

function getActivityLog() {
  if (!fs.existsSync(ACTIVITY_FILE)) {
    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify([], null, 2));
  }
  const data = fs.readFileSync(ACTIVITY_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}

function saveActivityLog(entries) {
  fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(entries, null, 2));
}

function appendActivity(entry) {
  const logs = getActivityLog();
  const newItem = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...entry
  };
  logs.unshift(newItem);
  saveActivityLog(logs.slice(0, 200));
}

function findProjectNameByPath(projectPath) {
  const projects = getProjects();
  const match = projects.find(project => String(project.path).toLowerCase() === String(projectPath).toLowerCase());
  return match ? match.name : null;
}

function runCommand(command, cwd) {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    return '';
  }
}

function parseJsonArray(input) {
  if (!input) return [];
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
    return [];
  } catch (error) {
    return [];
  }
}

function bytesToGb(value) {
  return Number((value / (1024 ** 3)).toFixed(1));
}

function createProjectRecord({ name, description, projectPath, tags, isPinned, rootFolder }) {
  return {
    id: Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
    name,
    description: description || '',
    path: projectPath,
    tags: tags || [],
    commands: [],
    isPinned: !!isPinned,
    rootFolder: rootFolder || null,
    status: 'stopped'
  };
}

function listSubfolders(mainFolderPath) {
  if (!mainFolderPath || !fs.existsSync(mainFolderPath)) return [];
  const stats = fs.statSync(mainFolderPath);
  if (!stats.isDirectory()) return [];

  const entries = fs.readdirSync(mainFolderPath, { withFileTypes: true });
  const folders = entries
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const fullPath = path.join(mainFolderPath, entry.name);
      return {
        name: entry.name,
        path: fullPath,
        hasGit: fs.existsSync(path.join(fullPath, '.git')),
        hasPackageJson: fs.existsSync(path.join(fullPath, 'package.json'))
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return folders;
}

// Helper to extract git metadata for a project path
function getGitStatus(projectPath) {
  const fallback = {
    isGitRepo: false,
    branch: null,
    hasUncommittedChanges: false,
    needsPush: false
  };

  if (!projectPath || !fs.existsSync(projectPath)) {
    return fallback;
  }

  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: projectPath,
      stdio: 'pipe'
    });

    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    const porcelain = execSync('git status --porcelain', {
      cwd: projectPath,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();

    let needsPush = false;
    try {
      const counts = execSync('git rev-list --left-right --count @{upstream}...HEAD', {
        cwd: projectPath,
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      const [behind, ahead] = counts.split(/\s+/).map(Number);
      needsPush = Number.isFinite(ahead) && ahead > 0;
    } catch (error) {
      // No upstream configured; treat as not needing push.
      needsPush = false;
    }

    return {
      isGitRepo: true,
      branch,
      hasUncommittedChanges: porcelain.length > 0,
      needsPush
    };
  } catch (error) {
    return fallback;
  }
}

// Get all projects
app.get('/projects', (req, res) => {
  const projects = getProjects().map(project => ({
    ...project,
    git: getGitStatus(project.path)
  }));
  res.json(projects);
});

// System monitor overview
app.get('/system/overview', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let cpuUsagePercent = null;
  let disks = [];

  if (process.platform === 'win32') {
    const cpuRaw = runCommand(
      'powershell -NoProfile -Command "(Get-Counter \'\\Processor(_Total)\\% Processor Time\').CounterSamples.CookedValue"'
    );
    cpuUsagePercent = Number.isFinite(Number(cpuRaw))
      ? Number(Number(cpuRaw).toFixed(1))
      : null;

    const diskJson = runCommand(
      'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\' | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json -Compress"'
    );
    disks = parseJsonArray(diskJson)
      .map(disk => {
        const totalBytes = Number(disk.Size || 0);
        const freeBytes = Number(disk.FreeSpace || 0);
        const usedBytes = Math.max(totalBytes - freeBytes, 0);
        const percent = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

        return {
          drive: disk.DeviceID,
          usedGb: bytesToGb(usedBytes),
          totalGb: bytesToGb(totalBytes),
          usagePercent: percent
        };
      })
      .sort((a, b) => a.drive.localeCompare(b.drive));
  } else {
    // Generic fallback for non-Windows
    const loadAvg = os.loadavg()[0];
    const cpus = os.cpus().length;
    cpuUsagePercent = Number(((loadAvg / cpus) * 100).toFixed(1));

    // Disk fallback (simplified, may need 'df' parsing for better accuracy)
    disks = [
      {
        drive: '/',
        usedGb: bytesToGb(totalMem - freeMem), // Fake disk usage based on RAM for placeholder
        totalGb: bytesToGb(totalMem),
        usagePercent: Number(((totalMem - freeMem) / totalMem * 100).toFixed(1))
      }
    ];
  }

  res.json({
    cpuUsagePercent,
    memory: {
      usedGb: bytesToGb(usedMem),
      totalGb: bytesToGb(totalMem),
      usagePercent: Number(((usedMem / totalMem) * 100).toFixed(1))
    },
    disks
  });
});

// Port manager overview
app.get('/system/ports', (req, res) => {
  const projects = getProjects();
  const ports = [];

  if (process.platform === 'win32') {
    const processJson = runCommand(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress -Depth 3"'
    );
    const processList = parseJsonArray(processJson);
    const processMap = new Map();
    for (const proc of processList) {
      processMap.set(String(proc.ProcessId), {
        name: proc.Name || 'Unknown',
        commandLine: proc.CommandLine || ''
      });
    }

    const netstatRaw = runCommand('netstat -ano -p tcp');
    const lines = netstatRaw.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('TCP')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 5) continue;

      const localAddress = parts[1];
      const state = parts[3];
      const pid = Number(parts[4]);
      if (state !== 'LISTENING' || !Number.isFinite(pid)) continue;

      const separatorIdx = localAddress.lastIndexOf(':');
      if (separatorIdx <= -1) continue;
      const host = localAddress.slice(0, separatorIdx).replace(/^[\[]|[\]]$/g, '');
      const port = Number(localAddress.slice(separatorIdx + 1));
      if (!Number.isFinite(port)) continue;

      const proc = processMap.get(String(pid)) || { name: 'Unknown', commandLine: '' };
      const commandLineLower = (proc.commandLine || '').toLowerCase();

      let projectName = null;
      for (const project of projects) {
        if (project.path && commandLineLower.includes(String(project.path).toLowerCase())) {
          projectName = project.name;
          break;
        }
      }

      ports.push({
        host,
        port,
        pid,
        processName: proc.name,
        projectName
      });
    }
  } else {
    // Basic lsof or netstat for non-Windows
    try {
      const lsofRaw = runCommand('lsof -iTCP -sTCP:LISTEN -P -n');
      const lines = lsofRaw.split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 9) continue;
        const processName = parts[0];
        const pid = parseInt(parts[1], 10);
        const addressParts = parts[8].split(':');
        const port = parseInt(addressParts[addressParts.length - 1], 10);
        const host = addressParts.slice(0, -1).join(':') || '*';

        ports.push({
          host,
          port,
          pid,
          processName,
          projectName: null // Harder to map project without command line on generic lsof
        });
      }
    } catch (e) {
      // Ignore if lsof is not available
    }
  }

  ports.sort((a, b) => a.port - b.port);
  res.json({ ports });
});

// Recent activity log
app.get('/activity', (req, res) => {
  res.json({ entries: getActivityLog() });
});

// Scan subfolders for bulk add
app.post('/folders/scan', (req, res) => {
  const { path: mainFolderPath } = req.body;
  if (!mainFolderPath) {
    return res.status(400).json({ error: 'Main folder path is required' });
  }

  if (!fs.existsSync(mainFolderPath)) {
    return res.status(404).json({ error: 'Main folder path not found' });
  }

  const folders = listSubfolders(mainFolderPath);
  res.json({ folders });
});

// Bulk add projects from a main folder
app.post('/projects/bulk-add', (req, res) => {
  const { mainFolderPath, selectedPaths, tags, descriptionPrefix, isPinned } = req.body;

  if (!mainFolderPath || !Array.isArray(selectedPaths) || selectedPaths.length === 0) {
    return res.status(400).json({ error: 'Main folder path and selected paths are required' });
  }

  let projects = getProjects();
  const existingPathSet = new Set(projects.map(project => String(project.path).toLowerCase()));
  const created = [];

  for (const subPath of selectedPaths) {
    if (!subPath || !fs.existsSync(subPath)) continue;
    if (existingPathSet.has(String(subPath).toLowerCase())) continue;

    const folderName = path.basename(subPath);
    const newProject = createProjectRecord({
      name: folderName,
      description: descriptionPrefix ? `${descriptionPrefix} (${folderName})` : '',
      projectPath: subPath,
      tags: tags || [],
      isPinned: !!isPinned,
      rootFolder: mainFolderPath
    });

    projects.push(newProject);
    existingPathSet.add(String(subPath).toLowerCase());
    created.push(newProject);
  }

  saveProjects(projects);
  res.status(201).json({ created, skipped: selectedPaths.length - created.length });
});

// Add a project
app.post('/projects', (req, res) => {
  const { name, description, path: projectPath, tags, isPinned, rootFolder } = req.body;
  if (!name || !projectPath) {
    return res.status(400).json({ error: 'Name and path are required' });       
  }

  const projects = getProjects();
  const newProject = createProjectRecord({
    name,
    description,
    projectPath,
    tags,
    isPinned,
    rootFolder
  });

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

// Update a project
app.put('/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, path: projectPath, tags, isPinned, rootFolder, commands } = req.body;
  
  let projects = getProjects();
  const projectIdx = projects.findIndex(p => p.id === id);
  
  if (projectIdx === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  projects[projectIdx] = {
    ...projects[projectIdx],
    name: name || projects[projectIdx].name,
    description: description !== undefined ? description : projects[projectIdx].description,
    path: projectPath || projects[projectIdx].path,
    tags: tags || projects[projectIdx].tags,
    isPinned: isPinned !== undefined ? isPinned : projects[projectIdx].isPinned,
    rootFolder: rootFolder !== undefined ? rootFolder : projects[projectIdx].rootFolder,
    commands: Array.isArray(commands) ? commands : (projects[projectIdx].commands || [])
  };

  saveProjects(projects);
  res.json(projects[projectIdx]);
});

// Run a saved or ad-hoc command for a project
app.post('/projects/:id/commands/run', (req, res) => {
  const { id } = req.params;
  const { commandId, label, command, workingDir } = req.body;

  const projects = getProjects();
  const project = projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  let commandToRun = command;
  let commandLabel = label || 'Custom Command';
  let commandWorkingDir = workingDir || '';

  if (!commandToRun && commandId && Array.isArray(project.commands)) {
    const found = project.commands.find(c => c.id === commandId);
    if (found) {
      commandToRun = found.command;
      commandLabel = found.label;
      commandWorkingDir = found.workingDir || '';
    }
  }

  if (!commandToRun) {
    return res.status(400).json({ error: 'Command is required' });
  }

  const resolvedCwd = commandWorkingDir
    ? path.resolve(project.path, commandWorkingDir)
    : project.path;

  if (!fs.existsSync(resolvedCwd)) {
    return res.status(400).json({ error: `Working directory not found: ${resolvedCwd}` });
  }

  exec(commandToRun, { cwd: resolvedCwd, shell: true }, (error, stdout, stderr) => {
    const output = `${stdout || ''}\n${stderr || ''}`.trim();
    const snippet = output ? output.slice(0, 280) : 'No output';

    if (error) {
      appendActivity({
        action: 'run-command',
        status: 'failed',
        projectName: project.name,
        path: resolvedCwd,
        details: `${commandLabel}: ${snippet}`
      });
      return;
    }

    appendActivity({
      action: 'run-command',
      status: 'success',
      projectName: project.name,
      path: resolvedCwd,
      details: `${commandLabel}: ${snippet}`
    });
  });

  res.json({ message: `Command '${commandLabel}' started.` });
});

// Stream command output via SSE
// Map of runId -> run session metadata (process + subscribers + history)
const runningProcesses = new Map();
// Map of commandKey -> runId, to attach to existing run of same saved command
const runningCommandKeys = new Map();

function pushHistory(session, entry) {
  session.history.push(entry);
  // Keep a small rolling buffer so re-opening a panel can replay recent logs.
  if (session.history.length > 500) {
    session.history.splice(0, session.history.length - 500);
  }
}

function broadcastToSession(session, entry) {
  pushHistory(session, entry);
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  session.clients.forEach((clientRes) => {
    if (clientRes.writableEnded) {
      session.clients.delete(clientRes);
      return;
    }
    clientRes.write(payload);
  });
}

function killProcessTree(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (_) { /* already dead */ }
}

app.get('/projects/:id/commands/stream', (req, res) => {
  const { id } = req.params;
  const { commandId } = req.query;

  const projects = getProjects();
  const project = projects.find(p => p.id === id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  let commandToRun = '';
  let commandLabel = '';
  let commandWorkingDir = '';

  if (commandId === '__default__') {
    const scriptPath = path.join(project.path, 'start.ps1');
    if (process.platform === 'win32' && fs.existsSync(scriptPath)) {
      commandToRun = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    } else {
      // Fallback: try npm start if package.json exists
      if (fs.existsSync(path.join(project.path, 'package.json'))) {
        commandToRun = 'npm start';
      } else {
        return res.status(400).json({ error: 'No default start script found.' });
      }
    }
    commandLabel = 'Default Start';
    commandWorkingDir = project.path;
  } else {
    const savedCmd = Array.isArray(project.commands) && project.commands.find(c => c.id === commandId);
    if (!savedCmd) {
      return res.status(400).json({ error: 'Command not found' });
    }
    commandToRun = savedCmd.command;
    commandLabel = savedCmd.label;
    commandWorkingDir = savedCmd.workingDir || '';
  }

  const resolvedCwd = commandWorkingDir
    ? path.resolve(project.path, commandWorkingDir)
    : project.path;

  if (!fs.existsSync(resolvedCwd)) {
    return res.status(400).json({ error: `Working directory not found: ${resolvedCwd}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const commandKey = `${id}:${commandId}`;

  if (runningCommandKeys.has(commandKey)) {
    const existingRunId = runningCommandKeys.get(commandKey);
    const existingSession = runningProcesses.get(existingRunId);

    if (existingSession) {
      existingSession.clients.add(res);
      res.write(`data: ${JSON.stringify({ type: 'info', runId: existingRunId, text: `Attached to running command: ${savedCmd.label}` })}\n\n`);
      existingSession.history.forEach((entry) => {
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
      });

      req.on('close', () => {
        existingSession.clients.delete(res);
      });
      return;
    }

    // Stale mapping fallback
    runningCommandKeys.delete(commandKey);
  }

  const runId = `${id}-${Date.now()}`;
  const child = spawn(commandToRun, [], {
    cwd: resolvedCwd,
    shell: true,
    detached: process.platform !== 'win32'
  });

  const session = {
    child,
    commandKey,
    clients: new Set([res]),
    history: []
  };

  runningProcesses.set(runId, session);
  runningCommandKeys.set(commandKey, runId);

  broadcastToSession(session, { type: 'info', text: `> ${commandToRun}`, cwd: resolvedCwd, runId });

  child.stdout.on('data', (data) => broadcastToSession(session, { type: 'stdout', text: data.toString() }));
  child.stderr.on('data', (data) => broadcastToSession(session, { type: 'stderr', text: data.toString() }));

  child.on('close', (code) => {
    runningCommandKeys.delete(commandKey);
    runningProcesses.delete(runId);
    broadcastToSession(session, { type: 'exit', code });

    appendActivity({
      action: 'run-command',
      status: code === 0 ? 'success' : 'failed',
      projectName: project.name,
      path: resolvedCwd,
      details: `${commandLabel}: exited with code ${code}`
    });

    session.clients.forEach((clientRes) => {
      if (!clientRes.writableEnded) {
        clientRes.end();
      }
    });
    session.clients.clear();
  });

  req.on('close', () => {
    // Do not kill process on stream close: user may just close the log view.
    session.clients.delete(res);
  });
});

// Kill a running command by runId
app.post('/projects/:id/commands/kill', (req, res) => {
  const { runId } = req.body;
  if (!runId) return res.status(400).json({ error: 'runId required' });
  const entry = runningProcesses.get(runId);
  if (!entry) return res.json({ message: 'Process not found (may have already exited)' });
  if (entry.commandKey) {
    runningCommandKeys.delete(entry.commandKey);
  }
  killProcessTree(entry.child.pid);
  runningProcesses.delete(runId);
  res.json({ message: 'Process killed' });
});

// Kill arbitrary process by PID
app.post('/system/processes/kill', (req, res) => {
  const { pid } = req.body;
  if (!pid) return res.status(400).json({ error: 'PID required' });
  killProcessTree(pid);
  res.json({ message: 'Process killed successfully' });
});

// Get all currently running processes
app.get('/running-processes', (req, res) => {
  const processes = [];

  for (const [runId, session] of runningProcesses.entries()) {
    const dashIdx = runId.lastIndexOf('-');
    const projectId = dashIdx > -1 ? runId.slice(0, dashIdx) : runId;
    const startedAt = dashIdx > -1 ? parseInt(runId.slice(dashIdx + 1), 10) : Date.now();

    const commandKey = session.commandKey || '';
    const colonIdx = commandKey.indexOf(':');
    const commandId = colonIdx > -1 ? commandKey.slice(colonIdx + 1) : '';

    processes.push({
      runId,
      projectId,
      commandId,
      startedAt: new Date(startedAt).toISOString(),
      pid: session.child?.pid || null
    });
  }

  res.json({ processes });
});

// Run start.ps1
app.post('/run', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Path is required' });

  const scriptPath = path.join(projectPath, 'start.ps1');
  const projectName = findProjectNameByPath(projectPath);

  // We are creating an async execution to not block if start.ps1 runs a server
  const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
  console.log(`Execution command: ${command}`);

  exec(command, { cwd: projectPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running start.ps1: ${error}`);
      appendActivity({
        action: 'run',
        status: 'failed',
        projectName,
        path: projectPath,
        details: error.message
      });
      return;
    }
    if (stderr) {
      console.error(`start.ps1 stderr: ${stderr}`);
    }
    appendActivity({
      action: 'run',
      status: 'success',
      projectName,
      path: projectPath,
      details: 'Started successfully'
    });
    console.log(`start.ps1 output: ${stdout}`);
  });

  res.json({ message: 'Started in background.' });
});

// Open VS Code
app.post('/open-vscode', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Path is required' });
  const projectName = findProjectNameByPath(projectPath);

  exec(`code "${projectPath}"`, { cwd: projectPath }, (error) => {
    if (error) {
       console.error(`Error opening VS Code: ${error}`);
       appendActivity({
         action: 'open-vscode',
         status: 'failed',
         projectName,
         path: projectPath,
         details: error.message
       });
       return res.status(500).json({ error: 'Failed to open VS Code' });
    }
    appendActivity({
      action: 'open-vscode',
      status: 'success',
      projectName,
      path: projectPath,
      details: 'Opened project in VS Code'
    });
    res.json({ message: 'VS Code opened' });
  });
});

// Open Folder
app.post('/open-folder', (req, res) => {
  const { path: projectPath } = req.body;
  if (!projectPath) return res.status(400).json({ error: 'Path is required' });
  const projectName = findProjectNameByPath(projectPath);

  const command = process.platform === 'win32'
    ? `explorer "${projectPath}"`
    : process.platform === 'darwin'
      ? `open "${projectPath}"`
      : `xdg-open "${projectPath}"`;

  exec(command, (error) => {
    if (error) {
       console.error(`Error opening folder: ${error}`);
       appendActivity({
         action: 'open-folder',
         status: 'failed',
         projectName,
         path: projectPath,
         details: error.message
       });
       return res.status(500).json({ error: 'Failed to open folder' });
    }
    appendActivity({
      action: 'open-folder',
      status: 'success',
      projectName,
      path: projectPath,
      details: 'Opened project folder in Explorer'
    });
    res.json({ message: 'Folder opened' });
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
