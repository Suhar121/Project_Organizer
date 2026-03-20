require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');
const os = require('os');
const {
  sequelize,
  Note,
  Setting,
  Project,
  ActivityLog,
  Label,
  PortAlias,
  KanbanTicket,
  ProjectIdea
} = require('./models');

const app = express();
const PORT = process.env.PORT || 6001;

const corsOptions = {
  origin: process.env.CORS_ORIGIN === '*' ? '*' : (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true),
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Sync database
sequelize.sync().then(() => {
  console.log('Database synced');
}).catch(err => {
  console.error('Failed to sync database:', err);
});

// Helper for shell escaping (basic version for security)
function shellEscape(arg) {
  if (process.platform === 'win32') {
    return `"${arg.replace(/"/g, '""')}"`;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

async function appendActivity(entry) {
  try {
    await ActivityLog.create({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...entry
    });
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
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

function runCommand(cmd, args = [], options = {}) {
  try {
    const fullCmd = args.length > 0 ? `${cmd} ${args.map(shellEscape).join(' ')}` : cmd;
    const result = execSync(fullCmd, {
      encoding: 'utf-8',
      ...options
    });
    return result.trim();
  } catch (e) {
    return '';
  }
}

function getGitStatus(projectPath) {
  try {
    if (!fs.existsSync(path.join(projectPath, '.git'))) {
      return { isGitRepo: false };
    }

    const branch = runCommand('git', ['-C', projectPath, 'rev-parse', '--abbrev-ref', 'HEAD']);
    const status = runCommand('git', ['-C', projectPath, 'status', '--porcelain']);
    const uncommitted = status.length > 0;

    let needsPush = false;
    try {
      const upstream = runCommand('git', ['-C', projectPath, 'rev-parse', '--abbrev-ref', '@{u}']);
      if (upstream) {
        const counts = runCommand('git', ['-C', projectPath, 'rev-list', '--left-right', '--count', `HEAD...${upstream}`]);
        const ahead = parseInt(counts.split('\t')[0], 10);
        needsPush = ahead > 0;
      }
    } catch (e) {}

    const lastCommitHash = runCommand('git', ['-C', projectPath, 'rev-parse', '--short', 'HEAD']);

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

// Projects API
app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.findAll();
    const projectsWithGit = projects.map(p => {
      const project = p.toJSON();
      return {
        ...project,
        git: getGitStatus(project.path)
      };
    });
    res.json(projectsWithGit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/projects', async (req, res) => {
  try {
    const project = await Project.create({
      id: Date.now().toString(),
      ...req.body,
      status: 'stopped'
    });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Not found' });
    await project.update(req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/projects/:id', async (req, res) => {
  try {
    await Project.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk add projects
app.post('/projects/bulk-add', async (req, res) => {
  try {
    const { selectedPaths, tags = [], descriptionPrefix = '', isPinned = false } = req.body;
    const created = [];
    let skipped = 0;

    for (const p of selectedPaths) {
      const name = path.basename(p);
      try {
        const project = await Project.create({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          name,
          path: p,
          description: `${descriptionPrefix} ${name}`.trim(),
          tags,
          isPinned,
          status: 'stopped'
        });
        created.push(project);
      } catch (e) {
        skipped++;
      }
    }
    res.json({ created, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan folders
app.post('/folders/scan', async (req, res) => {
  try {
    const { path: mainPath } = req.body;
    if (!fs.existsSync(mainPath)) return res.status(404).json({ error: 'Path not found' });

    const folders = fs.readdirSync(mainPath)
      .filter(f => fs.statSync(path.join(mainPath, f)).isDirectory())
      .map(f => {
        const fullPath = path.join(mainPath, f);
        return {
          name: f,
          path: fullPath,
          hasGit: fs.existsSync(path.join(fullPath, '.git')),
          hasPackageJson: fs.existsSync(path.join(fullPath, 'package.json'))
        };
      });
    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run project (Legacy/Simple)
app.post('/run', async (req, res) => {
  const { path: p } = req.body;
  // This is a placeholder for backward compatibility
  res.json({ message: 'Command streaming is preferred. No action taken.' });
});

// Run command (Legacy/Non-stream)
app.post('/projects/:id/commands/run', async (req, res) => {
  res.json({ message: 'Command streaming via /stream is preferred.' });
});

// Kanban API
app.get('/kanban/tickets', async (req, res) => {
  try {
    const tickets = await KanbanTicket.findAll({ order: [['order', 'ASC']] });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/kanban/tickets', async (req, res) => {
  try {
    const ticket = await KanbanTicket.create({
      id: Date.now().toString(),
      ...req.body
    });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/kanban/tickets/:id', async (req, res) => {
  try {
    const ticket = await KanbanTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    await ticket.update(req.body);
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/kanban/tickets/:id', async (req, res) => {
  try {
    await KanbanTicket.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Project Ideas API
app.get('/ideas', async (req, res) => {
  try {
    const ideas = await ProjectIdea.findAll({ order: [['createdAt', 'DESC']] });
    res.json(ideas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/ideas', async (req, res) => {
  try {
    const idea = await ProjectIdea.create({
      id: Date.now().toString(),
      ...req.body
    });
    res.json(idea);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/ideas/:id', async (req, res) => {
  try {
    await ProjectIdea.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Idea deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Folder View API
app.get('/projects/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { subPath = '' } = req.query;
    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const projectRoot = path.resolve(project.path);
    const targetPath = path.resolve(projectRoot, subPath);

    // Security check: ensure targetPath is within projectRoot
    if (!targetPath.startsWith(projectRoot)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(targetPath).map(file => {
        const filePath = path.join(targetPath, file);
        const fileStats = fs.statSync(filePath);
        return {
          name: file,
          path: path.join(subPath, file),
          isDirectory: fileStats.isDirectory(),
          size: fileStats.size,
          mtime: fileStats.mtime
        };
      });
      res.json({ isDirectory: true, files });
    } else {
      res.json({ isDirectory: false, name: path.basename(targetPath), size: stats.size });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Port Aliases API
app.get('/system/ports/aliases', async (req, res) => {
  try {
    const aliases = await PortAlias.findAll();
    res.json(aliases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/system/ports/aliases', async (req, res) => {
  try {
    const { port, alias } = req.body;
    await PortAlias.upsert({ port, alias });
    res.json({ port, alias });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Labels API
app.get('/labels', async (req, res) => {
  try {
    const labels = await Label.findAll();
    res.json(labels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/labels', async (req, res) => {
  try {
    const label = await Label.create({
      id: Date.now().toString(),
      ...req.body
    });
    res.json(label);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/labels/:id', async (req, res) => {
  try {
    await Label.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
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

// System monitor overview
app.get('/system/overview', async (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let cpuUsagePercent = null;
  let disks = [];

  if (process.platform === 'win32') {
    const cpuRaw = runCommand(
      'powershell', ['-NoProfile', '-Command', "(Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue"]
    );
    cpuUsagePercent = Number.isFinite(Number(cpuRaw))
      ? Number(Number(cpuRaw).toFixed(1))
      : null;

    const diskJson = runCommand(
      'powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json -Compress"]
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
    const loadAvg = os.loadavg()[0];
    const cpus = os.cpus().length;
    cpuUsagePercent = Number(((loadAvg / cpus) * 100).toFixed(1));

    try {
      const dfRaw = runCommand('df', ['-B1', '/']);
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
app.get('/system/ports', async (req, res) => {
  try {
    const projects = await Project.findAll();
    const ports = [];
    const aliases = await PortAlias.findAll();
    const aliasMap = new Map(aliases.map(a => [a.port, a.alias]));

    if (process.platform === 'win32') {
      const processJson = runCommand(
        'powershell', ['-NoProfile', '-Command', "Get-CimInstance Win32_Process | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress -Depth 3"]
      );
      const processList = parseJsonArray(processJson);
      const processMap = new Map();
      for (const proc of processList) {
        processMap.set(String(proc.ProcessId), {
          name: proc.Name || 'Unknown',
          commandLine: proc.CommandLine || ''
        });
      }

      const netstatRaw = runCommand('netstat', ['-ano', '-p', 'tcp']);
      const lines = netstatRaw.split(/\\r?\\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('TCP')) continue;

        const parts = trimmed.split(/\\s+/);
        if (parts.length < 5) continue;

        const localAddress = parts[1];
        const state = parts[3];
        const pid = parts[4];

        if (state !== 'LISTENING') continue;

        const portMatch = localAddress.match(/:(\\d+)$/);
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
          projectName,
          alias: aliasMap.get(port) || null
        });
      }
    } else {
      try {
        const ssRaw = runCommand('ss', ['-tulpn']);
        const lines = ssRaw.split('\\n');
        for (const line of lines) {
          if (!line.includes('LISTEN')) continue;
          const parts = line.split(/\\s+/);
          const localAddr = parts[4];
          const port = parseInt(localAddr.split(':').pop(), 10);
          const pidMatch = parts[6].match(/pid=(\\d+)/);
          const pid = pidMatch ? parseInt(pidMatch[1], 10) : 0;
          const nameMatch = parts[6].match(/"([^"]+)"/);
          const name = nameMatch ? nameMatch[1] : 'Unknown';

          ports.push({
            host: '0.0.0.0',
            port,
            pid,
            processName: name,
            projectName: null,
            alias: aliasMap.get(port) || null
          });
        }
      } catch (e) {}
    }

    res.json({ ports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/activity', async (req, res) => {
  try {
    const entries = await ActivityLog.findAll({
      order: [['timestamp', 'DESC']],
      limit: 200
    });
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  const payload = `data: ${JSON.stringify(entry)}\\n\\n`;
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

app.get('/projects/:id/commands/stream', async (req, res) => {
  try {
    const { id } = req.params;
    const { commandId } = req.query;

    const project = await Project.findByPk(id);
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
        res.write(`data: ${JSON.stringify({ type: 'info', runId: existingRunId, text: 'Attached to running command' })}\\n\\n`);
        existingSession.history.forEach(entry => res.write(`data: ${JSON.stringify(entry)}\\n\\n`));
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// VS Code and Folder open
app.post('/open-vscode', (req, res) => {
  const { path: p } = req.body;
  const safePath = shellEscape(p);
  exec(`code ${safePath}`, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    appendActivity({ action: 'open-vscode', status: 'success', path: p });
    res.json({ message: 'Opened' });
  });
});

app.post('/open-folder', (req, res) => {
  const { path: p } = req.body;
  const safePath = shellEscape(p);
  const cmd = process.platform === 'win32' ? `explorer ${safePath}` : process.platform === 'darwin' ? `open ${safePath}` : `xdg-open ${safePath}`;
  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    appendActivity({ action: 'open-folder', status: 'success', path: p });
    res.json({ message: 'Opened' });
  });
});

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));
