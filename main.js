const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let updateCheckInterval = null;

// ─── Window ───────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 860,
    minHeight: 560,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d0d0d',
      symbolColor: '#848484',
      height: 46,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(async () => {
  createWindow();

  // Check if this is first launch after an update
  const settings = loadSettings();
  if (settings.pendingPatchNotes) {
    const pn = settings.pendingPatchNotes;
    delete settings.pendingPatchNotes;
    saveSettings(settings);
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => mainWindow.webContents.send('first-launch-after-update', pn), 800);
    });
  }

  // Auto-update on startup
  if (settings.checkOnStartup !== false) {
    setTimeout(() => triggerUpdateCheck(), 3000);
  }

  // Periodic check
  schedulePeriodicCheck(settings.checkInterval || 'hourly');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Helpers: Storage Paths ───────────────────────────────────────────────────

const dataDir = () => app.getPath('userData');
const profilesPath = () => path.join(dataDir(), 'nomina-profiles.json');
const historyPath = () => path.join(dataDir(), 'nomina-history.json');
const settingsPath = () => path.join(dataDir(), 'nomina-settings.json');

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return fallback; }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadSettings() { return readJson(settingsPath(), {}); }
function saveSettings(s) { writeJson(settingsPath(), s); }

// ─── App Info ─────────────────────────────────────────────────────────────────

ipcMain.handle('get-version', () => app.getVersion());

// ─── Dialogs ──────────────────────────────────────────────────────────────────

ipcMain.handle('select-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select folder containing files',
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('select-output-folder', async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select output folder',
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('show-message-box', async (_, opts) => {
  const r = await dialog.showMessageBox(mainWindow, opts);
  return r.response;
});

ipcMain.handle('open-folder', (_, folderPath) => {
  shell.openPath(folderPath);
});

// ─── File System ──────────────────────────────────────────────────────────────

const SUPPORTED_EXTS = ['.pdf', '.xlsx', '.txt', '.xml', '.csv'];

ipcMain.handle('read-folder', (_, folderPath) => {
  try {
    return fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(e => e.isFile())
      .map(e => ({
        name: e.name,
        path: path.join(folderPath, e.name),
        ext: path.extname(e.name).toLowerCase(),
        dir: folderPath,
      }))
      .filter(f => SUPPORTED_EXTS.includes(f.ext));
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('file-exists', (_, p) => fs.existsSync(p));

// ─── PDF Value Extraction ─────────────────────────────────────────────────────

ipcMain.handle('extract-pdf-value', async (_, { filePath, keyword, position }) => {
  try {
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;

    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data, verbosity: 0 }).promise;
    const allItems = [];

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      for (const item of tc.items) {
        const str = item.str.trim();
        if (!str) continue;
        allItems.push({
          str,
          x: item.transform[4],
          y: vp.height - item.transform[5], // flip Y: higher = lower on page
          page: p,
        });
      }
    }

    // Find keyword (case-insensitive, single or multi-word)
    const kwLower = keyword.trim().toLowerCase();
    let kwIndex = -1;

    // Exact match
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].str.toLowerCase() === kwLower) { kwIndex = i; break; }
    }
    // Contains match
    if (kwIndex === -1) {
      for (let i = 0; i < allItems.length; i++) {
        if (allItems[i].str.toLowerCase().includes(kwLower)) { kwIndex = i; break; }
      }
    }
    // Multi-word consecutive match
    if (kwIndex === -1) {
      const words = kwLower.split(/\s+/);
      for (let i = 0; i <= allItems.length - words.length; i++) {
        const chunk = allItems.slice(i, i + words.length).map(x => x.str.toLowerCase()).join(' ');
        if (chunk === kwLower) { kwIndex = i + words.length - 1; break; }
      }
    }

    if (kwIndex === -1) return { success: false, error: `Keyword "${keyword}" not found in PDF` };

    const kw = allItems[kwIndex];
    const LINE_TOL = 8;
    let value = null;

    if (position === 'after') {
      const cands = allItems
        .filter((item, i) => i !== kwIndex && Math.abs(item.y - kw.y) <= LINE_TOL && item.x > kw.x + 2)
        .sort((a, b) => a.x - b.x);
      if (cands.length) value = cands[0].str;

    } else if (position === 'before') {
      const cands = allItems
        .filter((item, i) => i !== kwIndex && Math.abs(item.y - kw.y) <= LINE_TOL && item.x < kw.x - 2)
        .sort((a, b) => b.x - a.x);
      if (cands.length) value = cands[0].str;

    } else if (position === 'below') {
      const below = allItems
        .filter((item, i) => i !== kwIndex && item.y > kw.y + LINE_TOL && item.page === kw.page)
        .sort((a, b) => {
          const dy = a.y - b.y;
          if (Math.abs(dy) > 3) return dy;
          return Math.abs(a.x - kw.x) - Math.abs(b.x - kw.x);
        });
      if (below.length) value = below[0].str;

    } else if (position === 'above') {
      const above = allItems
        .filter((item, i) => i !== kwIndex && item.y < kw.y - LINE_TOL && item.page === kw.page)
        .sort((a, b) => {
          const dy = b.y - a.y;
          if (Math.abs(dy) > 3) return dy;
          return Math.abs(a.x - kw.x) - Math.abs(b.x - kw.x);
        });
      if (above.length) value = above[0].str;
    }

    if (!value) return { success: false, error: `No value found ${position} keyword "${keyword}"` };
    return { success: true, value };

  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Search Value in Non-PDF Files ───────────────────────────────────────────

ipcMain.handle('search-value-in-file', async (_, { filePath, value, keyword, ext }) => {
  try {
    if (ext === '.xlsx') {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(filePath);
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (!rows.length) continue;

        // 1) Try matching column header to keyword, then search that column
        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const colIdx = headers.findIndex(h => h === keyword.trim().toLowerCase());
        if (colIdx !== -1) {
          for (let r = 1; r < rows.length; r++) {
            if (String(rows[r][colIdx]).trim() === value.trim()) return { found: true };
          }
        }

        // 2) Fallback: search all cells
        for (const row of rows) {
          for (const cell of row) {
            if (String(cell).trim() === value.trim()) return { found: true };
          }
        }
      }
      return { found: false };
    } else {
      const content = fs.readFileSync(filePath, 'utf8');
      return { found: content.includes(value.trim()) };
    }
  } catch (err) {
    return { found: false, error: err.message };
  }
});

// ─── Rename / Copy ────────────────────────────────────────────────────────────

ipcMain.handle('rename-file', (_, { oldPath, newPath }) => {
  try {
    if (oldPath === newPath) return { status: 'skipped' };
    if (fs.existsSync(newPath)) return { status: 'conflict' };
    fs.renameSync(oldPath, newPath);
    return { status: 'success' };
  } catch (err) { return { status: 'error', error: err.message }; }
});

ipcMain.handle('copy-file', (_, { oldPath, newPath }) => {
  try {
    if (fs.existsSync(newPath)) return { status: 'conflict' };
    fs.copyFileSync(oldPath, newPath);
    return { status: 'success' };
  } catch (err) { return { status: 'error', error: err.message }; }
});

ipcMain.handle('force-rename-file', (_, { oldPath, newPath }) => {
  try {
    if (fs.existsSync(newPath) && oldPath !== newPath) fs.unlinkSync(newPath);
    fs.renameSync(oldPath, newPath);
    return { status: 'success' };
  } catch (err) { return { status: 'error', error: err.message }; }
});

ipcMain.handle('force-copy-file', (_, { oldPath, newPath }) => {
  try {
    fs.copyFileSync(oldPath, newPath);
    return { status: 'success' };
  } catch (err) { return { status: 'error', error: err.message }; }
});

// ─── Profiles ─────────────────────────────────────────────────────────────────

ipcMain.handle('load-profiles', () => readJson(profilesPath(), []));
ipcMain.handle('save-profiles', (_, profiles) => {
  writeJson(profilesPath(), profiles);
  return { success: true };
});

// ─── History ──────────────────────────────────────────────────────────────────

ipcMain.handle('get-history', () => {
  const h = readJson(historyPath(), []);
  return h.slice().reverse(); // newest first
});

ipcMain.handle('add-history', (_, entry) => {
  const h = readJson(historyPath(), []);
  h.push(entry);
  if (h.length > 200) h.splice(0, h.length - 200);
  writeJson(historyPath(), h);
});

ipcMain.handle('clear-history', () => {
  writeJson(historyPath(), []);
});

// ─── Settings ─────────────────────────────────────────────────────────────────

ipcMain.handle('get-settings', () => loadSettings());
ipcMain.handle('save-settings', (_, s) => {
  saveSettings(s);
  schedulePeriodicCheck(s.checkInterval || 'hourly');
  return { success: true };
});

// ─── Auto Updater ──────────────────────────────────────────────────────────────

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let lastCheckedVersion = null;

function triggerUpdateCheck() {
  autoUpdater.checkForUpdates().catch(err => {
    if (mainWindow) mainWindow.webContents.send('update-error', err.message);
  });
}

function schedulePeriodicCheck(interval) {
  if (updateCheckInterval) clearInterval(updateCheckInterval);
  const ms = { '30min': 30 * 60000, 'hourly': 60 * 60000, '6h': 6 * 3600000, 'daily': 24 * 3600000 };
  const delay = ms[interval] || ms['hourly'];
  updateCheckInterval = setInterval(triggerUpdateCheck, delay);
}

autoUpdater.on('update-available', info => {
  lastCheckedVersion = info.version;
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('download-progress', progress => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progress);
});

autoUpdater.on('update-downloaded', info => {
  // Store patch notes to show on next launch
  const settings = loadSettings();
  settings.pendingPatchNotes = {
    prevVersion: app.getVersion(),
    newVersion: info.version,
    notes: info.releaseNotes || '',
  };
  saveSettings(settings);
  if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

autoUpdater.on('update-not-available', () => {
  if (mainWindow) mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('error', err => {
  if (mainWindow) mainWindow.webContents.send('update-error', err.message);
});

ipcMain.handle('check-for-updates', () => {
  triggerUpdateCheck();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});
