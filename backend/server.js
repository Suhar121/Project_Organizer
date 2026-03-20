const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');
const os = require('os');
const { sequelize, Note, Setting, Project, ActivityLog, Label } = require('./models');

const app = express();
const PORT = process.env.PORT || 6001;
const PROJECTS_FILE = path.join(__dirname, 'projects.json');
const ACTIVITY_FILE = path.join(__dirname, 'activity-log.json');

app.use(cors());
app.use(express.json());

// Sync database
sequelize.sync().then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Failed to sync database:', err);
});

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

const bytesToGb = (bytes) => Number((bytes / (1024 ** 3)).toFixed(1));

function parseJsonArray(str) {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return [];
  }
}

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch (e) {
    return '';
  }
}

function findProjectNameByPath(targetPath) {
  const projects = getProjects();
  const p = projects.find(proj => path.resolve(proj.path) === path.resolve(targetPath));
  return p ? p.name : null;
}

function getGitStatus(projectPath) {
  try {
    if (!fs.existsSync(path.join(projectPath, '.git'))) {
      return { isGitRepo: false };
    }

    const branch = runCommand(`git -C "${projectPath}" rev-parse --abbrev-ref HEAD`);
    const status = runCommand(`git -C "${projectPath}" status --porcelain`);
    const uncommitted = status.length > 0;

    let needsPush = false;
    try {
      const upstream = runCommand(`git -C "${projectPath}" rev-parse --abbrev-ref @{u}`);
      if (upstream) {
        const counts = runCommand(`git -C "${projectPath}" rev-list --left-right --count HEAD...${upstream}`);
        const ahead = parseInt(counts.split('\t')[0], 10);
        needsPush = ahead > 0;
      }
    } catch (e) {}

    const lastCommitHash = runCommand(`git -C "${projectPath}" rev-parse --short HEAD`);

    return {
      isGitRepo: true,
      branch,
      hasUncommittedChanges: uncommitted,
      needsPush,
      lastCommitHash
    };
  } catch (e) {
    return { isGitRepo: false };
  }
}

// --- Endpoints ---

// Notes API
app.get('/notes', async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId } : {};
    const notes = await Note.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/notes', async (req, res) => {
  try {
    const { projectId, content } = req.body;
    const note = await Note.create({
      id: Date.now().toString(),
      content,
      projectId: projectId || 'global',
      createdAt: new Date().toISOString()
    });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const note = await Note.findByPk(id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    note.content = content;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Note.destroy({ where: { id } });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings API
app.get('/settings', async (req, res) => {
  try {
    const settings = await Setting.findByPk('llm_config');
    res.json(settings ? settings.value : { provider: 'openai', apiKey: '', baseURL: '', model: '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/settings', async (req, res) => {
  try {
    await Setting.upsert({
      key: 'llm_config',
      value: req.body
    });
    res.json({ message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    try {
      const dfRaw = runCommand('df -B1 /');
      const lines = dfRaw.split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        if (parts.length >= 4) {
          const totalBytes = parseInt(parts[1], 10);
          const usedBytes = parseInt(parts[2], 10);
          disks = [{
            drive: '/',
            usedGb: bytesToGb(usedBytes),
            totalGb: bytesToGb(totalBytes),
            usagePercent: Number(((usedBytes / totalBytes) * 100).toFixed(1))
          }];
        }
      }
    } catch (e) {
      disks = [{ drive: '/', usedGb: 0, totalGb: 0, usagePercent: 0 }];
    }
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
      const pid = parts[4];

      if (state !== 'LISTENING') continue;

      const portMatch = localAddress.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      const procInfo = processMap.get(pid) || { name: 'Unknown', commandLine: '' };

      let projectName = null;
      for (const project of projects) {
        const resolvedPath = path.resolve(project.path).toLowerCase();
        if (procInfo.commandLine.toLowerCase().includes(resolvedPath)) {
          projectName = project.name;
          break;
        }
      }

      ports.push({
        host: localAddress.split(':')[0],
        port,
        pid: parseInt(pid, 10),
        processName: procInfo.name,
        projectName
      });
    }
  } else {
    try {
      const ssRaw = runCommand('ss -tulpn');
      const lines = ssRaw.split('\n');
      for (const line of lines) {
        if (!line.includes('LISTEN')) continue;
        const parts = line.split(/\s+/);
        const localAddr = parts[4];
        const port = parseInt(localAddr.split(':').pop(), 10);
        const pidMatch = parts[6].match(/pid=(\d+)/);
        const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;
        const nameMatch = parts[6].match(/"([^"]+)"/);
        const name = nameMatch ? nameMatch[1] : 'Unknown';

        ports.push({
          host: '0.0.0.0',
          port,
          pid,
          processName: name,
          projectName: null
        });
      }
    } catch (e) {}
  }

  res.json({ ports });
});

app.get('/activity', (req, res) => {
  res.json({ entries: getActivityLog() });
});

// Map of runId -> run session metadata
const runningProcesses = new Map();
const runningCommandKeys = new Map();

function pushHistory(session, entry) {
  session.history.push(entry);
  if (session.history.length > 500) {
    session.history.splice(0, session.history.length - 500);
  }
}

function broadcastToSession(session, entry) {
  pushHistory(session, entry);
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  session.clients.forEach((clientRes) => {
    if (!clientRes.writableEnded) {
      clientRes.write(payload);
    }
  });
}

function killProcessTree(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch (_) {}
}

app.get('/projects/:id/commands/stream', (req, res) => {
  const { id } = req.params;
  const { commandId } = req.query;

  const projects = getProjects();
  const project = projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  let commandToRun = '';
  let commandLabel = '';
  let commandWorkingDir = '';

  if (commandId === '__default__') {
    const scriptPath = path.join(project.path, 'start.ps1');
    if (process.platform === 'win32' && fs.existsSync(scriptPath)) {
      commandToRun = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    } else {
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
    if (!savedCmd) return res.status(400).json({ error: 'Command not found' });
    commandToRun = savedCmd.command;
    commandLabel = savedCmd.label;
    commandWorkingDir = savedCmd.workingDir || '';
  }

  const resolvedCwd = commandWorkingDir ? path.resolve(project.path, commandWorkingDir) : project.path;

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
      res.write(`data: ${JSON.stringify({ type: 'info', runId: existingRunId, text: 'Attached to running command' })}\n\n`);
      existingSession.history.forEach(entry => res.write(`data: ${JSON.stringify(entry)}\n\n`));
      req.on('close', () => existingSession.clients.delete(res));
      return;
    }
  }

  const runId = `${id}-${Date.now()}`;
  const child = spawn(commandToRun, [], {
    cwd: resolvedCwd,
    shell: true,
    detached: process.platform !== 'win32'
  });

  const session = { child, commandKey, clients: new Set([res]), history: [] };
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
    session.clients.forEach(c => !c.writableEnded && c.end());
    session.clients.clear();
  });

  req.on('close', () => session.clients.delete(res));
});

app.post('/projects/:id/commands/kill', (req, res) => {
  const { runId } = req.body;
  const entry = runningProcesses.get(runId);
  if (!entry) return res.json({ message: 'Process not found' });
  if (entry.commandKey) runningCommandKeys.delete(entry.commandKey);
  killProcessTree(entry.child.pid);
  runningProcesses.delete(runId);
  res.json({ message: 'Process killed' });
});

app.post('/system/processes/kill', (req, res) => {
  const { pid } = req.body;
  killProcessTree(pid);
  res.json({ message: 'Process killed successfully' });
});

app.get('/running-processes', (req, res) => {
  const processes = [];
  for (const [runId, session] of runningProcesses.entries()) {
    const dashIdx = runId.lastIndexOf('-');
    processes.push({
      runId,
      projectId: runId.slice(0, dashIdx),
      startedAt: new Date(parseInt(runId.slice(dashIdx + 1), 10)).toISOString(),
      pid: session.child?.pid || null
    });
  }
  res.json({ processes });
});

app.post('/projects', (req, res) => {
  const projects = getProjects();
  const newProject = {
    id: Date.now().toString(),
    ...req.body,
    status: 'stopped'
  };
  projects.push(newProject);
  saveProjects(projects);
  res.json(newProject);
});

app.put('/projects/:id', (req, res) => {
  const projects = getProjects();
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  projects[idx] = { ...projects[idx], ...req.body };
  saveProjects(projects);
  res.json(projects[idx]);
});

app.delete('/projects/:id', (req, res) => {
  const projects = getProjects().filter(p => p.id !== req.params.id);
  saveProjects(projects);
  res.json({ message: 'Deleted' });
});

// VS Code and Folder open
app.post('/open-vscode', (req, res) => {
  const { path: p } = req.body;
  exec(`code "${p}"`, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    appendActivity({ action: 'open-vscode', status: 'success', path: p });
    res.json({ message: 'Opened' });
  });
});

app.post('/open-folder', (req, res) => {
  const { path: p } = req.body;
  const cmd = process.platform === 'win32' ? `explorer "${p}"` : process.platform === 'darwin' ? `open "${p}"` : `xdg-open "${p}"`;
  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    appendActivity({ action: 'open-folder', status: 'success', path: p });
    res.json({ message: 'Opened' });
  });
});

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
