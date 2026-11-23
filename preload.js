const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('electronAPI', {
  serial: {
    listPorts: () => invoke('serial:list-ports'),
  },
  android: {
    adbStatus: () => invoke('android:adb-status'),
    devices: () => invoke('android:devices'),
    sendSMS: (args) => invoke('android:send-sms', args),
    sendBulk: (args) => invoke('android:send-bulk', args),
    readContacts: (args) => invoke('android:read-contacts', args),
    readSMS: (args) => invoke('android:read-sms', args),
    importContacts: (args) => invoke('android:import-contacts', args),
    importSMS: (args) => invoke('android:import-sms', args),
  },
  devices: {
    listAll: () => invoke('devices:list-all'),
  },
});
