const { contextBridge, ipcRenderer } = require('electron');

// Expose Android/ADB API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  android: {
    adbStatus:      ()  => ipcRenderer.invoke('android:adb-status'),
    devices:        ()  => ipcRenderer.invoke('android:devices'),
    sendSMS:        (a) => ipcRenderer.invoke('android:send-sms', a),
    sendBulk:       (a) => ipcRenderer.invoke('android:send-bulk', a),
    readContacts:   (a) => ipcRenderer.invoke('android:read-contacts', a),
    readSMS:        (a) => ipcRenderer.invoke('android:read-sms', a),
    importContacts: (a) => ipcRenderer.invoke('android:import-contacts', a),
    importSMS:      (a) => ipcRenderer.invoke('android:import-sms', a),
  },
  serial: {
    listPorts: () => ipcRenderer.invoke('serial:list-ports'),
  },
    devices: {
    listAll: () => ipcRenderer.invoke('devices:list-all'),
  }
});
