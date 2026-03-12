const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nomina', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Dialogs
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  showMessageBox: (opts) => ipcRenderer.invoke('show-message-box', opts),
  openFolder: (p) => ipcRenderer.invoke('open-folder', p),

  // File system
  readFolder: (p) => ipcRenderer.invoke('read-folder', p),
  fileExists: (p) => ipcRenderer.invoke('file-exists', p),

  // Core operations
  extractPdfValue: (params) => ipcRenderer.invoke('extract-pdf-value', params),
  searchValueInFile: (params) => ipcRenderer.invoke('search-value-in-file', params),
  renameFile: (params) => ipcRenderer.invoke('rename-file', params),
  copyFile: (params) => ipcRenderer.invoke('copy-file', params),
  forceRenameFile: (params) => ipcRenderer.invoke('force-rename-file', params),
  forceCopyFile: (params) => ipcRenderer.invoke('force-copy-file', params),

  // Profiles
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
  saveProfiles: (profiles) => ipcRenderer.invoke('save-profiles', profiles),

  // History
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (entry) => ipcRenderer.invoke('add-history', entry),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),

  // Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  approveDownload: () => ipcRenderer.invoke('approve-download'),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
  onDownloadProgress: (cb) => ipcRenderer.on('download-progress', (_, p) => cb(p)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (_, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', () => cb()),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (_, msg) => cb(msg)),
  onFirstLaunchAfterUpdate: (cb) => ipcRenderer.on('first-launch-after-update', (_, data) => cb(data)),
  setTitleBarOverlay: (opts) => ipcRenderer.invoke('set-titlebar-overlay', opts),
});
