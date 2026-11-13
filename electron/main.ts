import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fork, ChildProcess } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maximum Desktop GPU & CPU Acceleration Switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function waitForServer(url: string, retries = 60, delay = 50): Promise<void> {
  return new Promise((resolve) => {
    let attempted = 0;
    const check = () => {
      attempted++;
      const req = http.get(url, (res) => {
        if (res.statusCode) {
          resolve();
        } else if (attempted < retries) {
          setTimeout(check, delay);
        } else {
          resolve();
        }
      });
      req.on('error', () => {
        if (attempted < retries) {
          setTimeout(check, delay);
        } else {
          resolve();
        }
      });
    };
    check();
  });
}

function checkServerOnline(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(Boolean(res.statusCode));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startServerProcess(): Promise<string> {
  return new Promise(async (resolve) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
      await waitForServer(devServerUrl);
      resolve(devServerUrl);
      return;
    }

    const alreadyRunning = await checkServerOnline('http://127.0.0.1:3000');
    if (alreadyRunning) {
      console.log('Host server already active on port 3000. Connecting directly.');
      resolve('http://127.0.0.1:3000');
      return;
    }

    const appPath = app.getAppPath();
    const candidatePaths = [
      path.join(appPath, '.output/server/index.mjs'),
      path.join(__dirname, '../../.output/server/index.mjs'),
      path.join(__dirname, '../.output/server/index.mjs'),
    ];

    const targetPath = candidatePaths.find((p) => fs.existsSync(p));

    if (targetPath) {
      console.log('Loading Nitro production server:', targetPath);
      process.env.PORT = '3000';
      process.env.HOST = '0.0.0.0';
      try {
        await import(pathToFileURL(targetPath).href);
      } catch (err) {
        console.error('Direct import failed, falling back to process fork:', err);
        serverProcess = fork(targetPath, [], {
          env: { ...process.env, PORT: '3000', HOST: '0.0.0.0', ELECTRON_RUN_AS_NODE: '1' },
        });
      }
    } else {
      console.error('Nitro production server file not found in candidates:', candidatePaths);
    }

    await waitForServer('http://127.0.0.1:3000');
    resolve('http://127.0.0.1:3000');
  });
}

async function createWindow() {
  const iconCandidates = [
    path.join(app.getAppPath(), 'public', 'mss-logo.ico'),
    path.join(app.getAppPath(), 'public', 'mss-logo.png'),
    path.join(__dirname, '..', 'public', 'mss-logo.ico'),
    path.join(__dirname, '..', 'public', 'mss-logo.png'),
    path.join(process.resourcesPath || '', 'public', 'mss-logo.ico'),
    path.join(process.resourcesPath || '', 'public', 'mss-logo.png'),
  ];
  const iconPath = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    fullscreen: true,
    autoHideMenuBar: true,
    title: 'MSS Ponkumar Store — Wholesale Billing & POS Console',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: iconPath,
    backgroundColor: '#1B2D6B',
  });

  mainWindow.setMenu(null);

  const splashHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #1B2D6B;
          color: #ffffff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          user-select: none;
          overflow: hidden;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .logo-box {
          width: 88px;
          height: 88px;
          border-radius: 20px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.35);
          margin-bottom: 18px;
        }
        .logo-box svg {
          width: 52px;
          height: 52px;
        }
        .shop-name {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-align: center;
        }
        .shop-badge {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 3px;
          color: #E8151B;
          background: rgba(255,255,255,0.12);
          padding: 3px 12px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .spinner {
          margin-top: 30px;
          width: 32px;
          height: 32px;
          border: 3.5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status {
          margin-top: 14px;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="%231B2D6B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </div>
        <div class="shop-name">MSS PONKUMAR STORE</div>
        <div class="shop-badge">WHOLESALE SHOP • OFFLINE POS</div>
        <div class="spinner"></div>
        <div class="status">Starting Embedded Server & SQLite Database...</div>
      </div>
    </body>
    </html>
  `;

  // Instantly show the branded splash window so there is zero white flash
  await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
  mainWindow.show();
  mainWindow.maximize();

  const targetUrl = await startServerProcess();
  await mainWindow.loadURL(`${targetUrl}/apps`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

// IPC Communication Handlers
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('backup:get-dir', () => {
  const backupDir = path.join(app.getPath('userData'), 'Backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
});

ipcMain.handle('printer:print-receipt', async () => {
  if (mainWindow) {
    mainWindow.webContents.print({ silent: false, printBackground: true });
  }
  return { success: true };
});
