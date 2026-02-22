const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    updater: {
        checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
        installUpdate: () => ipcRenderer.invoke('install-update'),
        onUpdateChecking: (callback) => ipcRenderer.on('update-checking', callback),
        onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, version) => callback(version)),
        onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_event, version) => callback(version)),
        onUpdateError: (callback) => ipcRenderer.on('update-error', (_event, error) => callback(error)),
        onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, progress) => callback(progress)),
        onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),
        onAppVersion: (callback) => ipcRenderer.on('app-version', (_event, version) => callback(version)),
    }
})
