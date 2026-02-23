const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

const HISTORY_PATH = path.join(app.getPath('userData'), 'nomina_history.json');

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_PATH)) return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
  } catch (e) {}
  return [];
}

function saveHistory(history) {
  try { fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2)); return true; }
  catch (e) { return false; }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../dist/favicon.ico'),
    title: 'Nomina',
  });

  win.loadFile(path.join(__dirname, '../dist/index.html'));

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('app-version', app.getVersion());
  });

  ipcMain.on('window-minimize', () => win.minimize());
  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.on('window-close', () => win.close());
}

app.whenReady().then(() => {
  createWindow();

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';

  const win = BrowserWindow.getAllWindows()[0];

  autoUpdater.on('checking-for-update', () => {
    if (win) win.webContents.send('update-checking');
  });

  autoUpdater.on('update-available', (info) => {
    if (win) win.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-not-available', (info) => {
    if (win) win.webContents.send('update-not-available', info.version);
  });

  autoUpdater.on('download-progress', (progress) => {
    if (win) win.webContents.send('update-progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    });
  });

  autoUpdater.on('update-downloaded', () => {
    if (win) win.webContents.send('update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    if (win) win.webContents.send('update-error', err.message);
  });

  ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdates().catch(err => {
      if (win) win.webContents.send('update-error', err.message);
    });
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('get-history', () => loadHistory());

  ipcMain.handle('add-history-entry', (_, entry) => {
    const h = loadHistory();
    h.unshift(entry);
    if (h.length > 100) h.splice(100);
    return saveHistory(h);
  });

  ipcMain.handle('clear-history', () => saveHistory([]));

  ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
