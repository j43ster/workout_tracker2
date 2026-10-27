import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Ensure data directory exists for Pi local persistence backup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const workoutsFile = path.join(dataDir, 'workouts_backup.json');
if (!fs.existsSync(workoutsFile)) {
  fs.writeFileSync(workoutsFile, JSON.stringify([]), 'utf-8');
}

// In-memory telemetry bus for multi-device sync (e.g. Pi connects to BLE, Phone displays live HUD)
let latestTelemetry: any = {
  timestamp: Date.now(),
  hr: 0,
  watts: 0,
  cadence: 0,
  calories: 0,
  distanceMeters: 0,
  speedKmh: 0,
  workoutActive: false,
  workoutElapsedSec: 0,
  workoutMode: 'idle',
  deviceStatus: {
    polarH10: { connected: false, name: 'Polar H10', battery: 92 },
    rogueEcho: { connected: false, name: 'Rogue Echo Console', battery: 100 }
  }
};

// SSE subscribers for live multi-screen broadcast
const sseClients: Response[] = [];

// API: Get Raspberry Pi system info & local network IP addresses
app.get('/api/pi/info', (_req: Request, res: Response) => {
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses: { name: string; address: string }[] = [];

  for (const [name, nets] of Object.entries(networkInterfaces)) {
    if (nets) {
      for (const net of nets) {
        // Skip internal/loopback and non-IPv4
        if (!net.internal && net.family === 'IPv4') {
          ipAddresses.push({ name, address: net.address });
        }
      }
    }
  }

  // Attempt to read Pi CPU thermal temp if running on Linux / Raspberry Pi
  let cpuTempC: number | null = null;
  try {
    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const rawTemp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf-8');
      cpuTempC = Math.round((parseInt(rawTemp.trim(), 10) / 1000) * 10) / 10;
    }
  } catch (err) {
    // Ignore if not on physical Pi
  }

  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptimeSeconds: Math.floor(os.uptime()),
    freeMemMb: Math.round(os.freemem() / (1024 * 1024)),
    totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
    cpuTempC,
    isRaspberryPi: fs.existsSync('/sys/firmware/devicetree/base/model') || os.arch().includes('arm'),
    ipAddresses,
    serverPort: PORT,
    appUrl: process.env.APP_URL || `http://${ipAddresses[0]?.address || 'localhost'}:${PORT}`
  });
});

// API: Broadcast telemetry from browser or external Pi BLE service
app.post('/api/telemetry/live', (req: Request, res: Response) => {
  latestTelemetry = { ...latestTelemetry, ...req.body, timestamp: Date.now() };
  
  // Notify SSE listeners
  const data = JSON.stringify(latestTelemetry);
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(`data: ${data}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }

  res.json({ success: true, timestamp: latestTelemetry.timestamp });
});

// API: Get current telemetry snapshot
app.get('/api/telemetry/live', (_req: Request, res: Response) => {
  res.json(latestTelemetry);
});

// API: SSE stream for real-time dashboard sync across desktop and mobile devices
app.get('/api/telemetry/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  res.write(`data: ${JSON.stringify(latestTelemetry)}\n\n`);
  sseClients.push(res);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// API: Backup workouts to Pi storage
app.get('/api/workouts', (_req: Request, res: Response) => {
  try {
    const raw = fs.readFileSync(workoutsFile, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read workouts from disk' });
  }
});

app.post('/api/workouts', (req: Request, res: Response) => {
  try {
    const workout = req.body;
    let existing: any[] = [];
    if (fs.existsSync(workoutsFile)) {
      existing = JSON.parse(fs.readFileSync(workoutsFile, 'utf-8'));
    }
    const idx = existing.findIndex((w: any) => w.id === workout.id);
    if (idx >= 0) {
      existing[idx] = workout;
    } else {
      existing.unshift(workout);
    }
    fs.writeFileSync(workoutsFile, JSON.stringify(existing, null, 2), 'utf-8');
    res.json({ success: true, id: workout.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save workout' });
  }
});

app.delete('/api/workouts/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (fs.existsSync(workoutsFile)) {
      const existing = JSON.parse(fs.readFileSync(workoutsFile, 'utf-8'));
      const filtered = existing.filter((w: any) => w.id !== id);
      fs.writeFileSync(workoutsFile, JSON.stringify(filtered, null, 2), 'utf-8');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

async function startServer() {
  if (!isProduction) {
    // In dev mode, mount Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EchoPulse] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
