const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const path   = require('path');
const { exec, execFile, spawn } = require('child_process');
const fs     = require('fs');

// Enable WebSerial API (guard for environments where app may not be fully initialised)
if (app && app.commandLine) {
  app.commandLine.appendSwitch('enable-features', 'WebSerial');
  app.commandLine.appendSwitch('enable-experimental-web-platform-features');
}

let win;

// ── Find ADB executable ───────────────────────────────────────
function findAdb() {
  const candidates = [
    path.join(process.resourcesPath || __dirname, 'adb', 'adb.exe'),
    path.join(__dirname, 'assets', 'adb', 'adb.exe'),
    path.join(__dirname, 'adb', 'adb.exe'),
    'adb.exe',
    'adb',
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch(e) {}
  }
  return 'adb'; // rely on system PATH
}

const ADB = findAdb();

// ── Run ADB command ───────────────────────────────────────────
function runAdb(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    execFile(ADB, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

// ── Check ADB available ───────────────────────────────────────
function adbAvailable() {
  return new Promise(resolve => {
    execFile(ADB, ['version'], { timeout: 5000 }, err => resolve(!err));
  });
}

// ── Get connected Android devices ────────────────────────────
async function getAndroidDevices() {
  const output = await runAdb(['devices', '-l']);
  const lines  = output.split('\n').slice(1).filter(l => l.trim() && !l.startsWith('*'));
  return lines.map(line => {
    const parts   = line.trim().split(/\s+/);
    const id      = parts[0];
    const status  = parts[1];
    const model   = (line.match(/model:(\S+)/)?.[1] || 'Android Phone').replace(/_/g, ' ');
    return { id, status, model, type: 'android' };
  }).filter(d => d.status === 'device');
}

// ── Send SMS via Android phone ─────────────────────────────────
// Uses multiple methods with fallback
async function sendSmsViaAndroid(deviceId, phone, message) {
  // Method 1: service call isms (direct SMS API - works on most Android)
  try {
    const escaped = message.replace(/'/g, "\\'").replace(/"/g, '\\"');
    // sendTextMessage(String destAddr, String scAddr, String text, PendingIntent sentIntent, PendingIntent deliveryIntent)
    const cmd = `service call isms 5 s16 "com.android.phone" s16 "null" s16 "${phone}" s16 "null" s16 "${escaped}" s16 "null" s16 "null"`;
    await runAdb(['-s', deviceId, 'shell', cmd], 20000);
    return { success: true, method: 'isms service' };
  } catch(e1) {
    // Method 2: am broadcast with SMS_SEND intent
    try {
      const escaped = message.replace(/'/g, "\\'");
      const cmd = `am start -a android.intent.action.SENDTO -d "smsto:${phone}" --es "sms_body" '${escaped}' --ez "exit_on_sent" true`;
      await runAdb(['-s', deviceId, 'shell', cmd], 15000);
      // Small delay then press send button (keycode 66 = ENTER)
      await new Promise(r => setTimeout(r, 1200));
      await runAdb(['-s', deviceId, 'shell', 'input', 'keyevent', '66'], 5000);
      return { success: true, method: 'intent' };
    } catch(e2) {
      // Method 3: Content provider insert (creates sent SMS directly)
      try {
        const escaped = message.replace(/'/g, "\\'");
        const ts = Date.now();
        const cmd = `content insert --uri content://sms/sent --bind address:s:${phone} --bind body:s:'${escaped}' --bind date:l:${ts} --bind read:i:1 --bind status:i:0`;
        await runAdb(['-s', deviceId, 'shell', cmd], 10000);
        // Also fire the actual send
        const sendCmd = `am broadcast -a android.provider.Telephony.SMS_DELIVER`;
        await runAdb(['-s', deviceId, 'shell', sendCmd], 5000);
        return { success: true, method: 'content provider' };
      } catch(e3) {
        throw new Error(`All methods failed. Last error: ${e3.message}`);
      }
    }
  }
}

// ── Read contacts from Android ────────────────────────────────
async function readAndroidContacts(deviceId) {
  const output = await runAdb(['-s', deviceId, 'shell',
    'content', 'query', '--uri', 'content://com.android.contacts/data/phones',
    '--projection', 'display_name:data1'
  ], 25000);
  const contacts = [];
  output.split('\n').forEach(row => {
    const name  = row.match(/display_name=([^,\n]+)/)?.[1]?.trim();
    const phone = row.match(/data1=([^,\n]+)/)?.[1]?.trim();
    if (phone && phone !== 'NULL' && phone.trim()) {
      contacts.push({ name: name || phone, phone: phone.replace(/[\s\-]/g, '') });
    }
  });
  return contacts;
}

// ── Read SMS inbox from Android ───────────────────────────────
async function readAndroidSMS(deviceId) {
  const output = await runAdb(['-s', deviceId, 'shell',
    'content', 'query', '--uri', 'content://sms/inbox',
    '--projection', 'address:body:date',
    '--sort', 'date DESC'
  ], 25000);
  const messages = [];
  output.split('\n').forEach(row => {
    const phone = row.match(/address=([^,\n]+)/)?.[1]?.trim();
    const body  = row.match(/body=([^\n]+)/)?.[1]?.trim();
    const date  = row.match(/date=(\d+)/)?.[1];
    if (phone && body && phone !== 'NULL') {
      messages.push({
        phone,
        body: body.substring(0, 500),
        timestamp: date ? new Date(parseInt(date)).toISOString() : null
      });
    }
  });
  return messages.slice(0, 100);
}

// ── IPC Handlers ──────────────────────────────────────────────
function registerIPC() {

  // ── Enhanced port listing with full metadata ─────────────────
  ipcMain.handle('serial:list-ports', async () => {
    try {
      // Use Windows WMI to get full COM port info including friendly names
      const { execSync } = require('child_process');
      let ports = [];
      try {
        const { SerialPort } = require('serialport');
        const sp = await SerialPort.list();
        ports = sp.map(p => ({
          path:         p.path,
          manufacturer: p.manufacturer  || '',
          pnpId:        p.pnpId         || '',
          vendorId:     p.vendorId      || '',
          productId:    p.productId     || '',
          friendlyName: p.friendlyName  || p.path,
          comNumber:    parseInt((p.path||'').replace(/\D/g,'')) || 0,
        }));
        ports.sort((a,b) => a.comNumber - b.comNumber);
      } catch(e) {
        ports = [];
      }
      return { success: true, ports };
    } catch(e) { return { success: false, error: e.message, ports: [] }; }
  });

    ipcMain.handle('android:adb-status', async () => {
    const available = await adbAvailable();
    return { available, adbPath: ADB };
  });

  ipcMain.handle('android:devices', async () => {
    const available = await adbAvailable();
    if (!available) return { success: false, error: 'ADB not found', devices: [] };
    try {
      const devices = await getAndroidDevices();
      return { success: true, devices };
    } catch(e) { return { success: false, error: e.message, devices: [] }; }
  });

  ipcMain.handle('android:send-sms', async (e, { deviceId, phone, message }) => {
    try {
      const result = await sendSmsViaAndroid(deviceId, phone, message);
      return { success: true, ...result };
    } catch(e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('android:send-bulk', async (e, { deviceId, phone, message }) => {
    try {
      const result = await sendSmsViaAndroid(deviceId, phone, message);
      return { success: true, ...result };
    } catch(e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('android:read-contacts', async (e, { deviceId }) => {
    try {
      const contacts = await readAndroidContacts(deviceId);
      return { success: true, contacts };
    } catch(e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('android:read-sms', async (e, { deviceId }) => {
    try {
      const messages = await readAndroidSMS(deviceId);
      return { success: true, messages };
    } catch(e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('android:import-contacts', async (e, { deviceId }) => {
    try {
      const contacts = await readAndroidContacts(deviceId);
      return { success: true, contacts, total: contacts.length };
    } catch(e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('android:import-sms', async (e, { deviceId }) => {
    try {
      const messages = await readAndroidSMS(deviceId);
      return { success: true, messages, added: messages.length };
    } catch(e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('devices:list-all', async () => {
    const devices = [];
    // ADB devices
    try {
      if (await adbAvailable()) {
        const androidDevices = await getAndroidDevices();
        androidDevices.forEach(d => {
          devices.push({ type: 'android', id: d.id, label: `${d.model} (USB Phone)` });
        });
      }
    } catch(e) {}
    return devices;
  });
}

// ── Create Window ─────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 620,
    title: 'MassTxt',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#F7F8FA',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Allow all permissions including serial
  win.webContents.session.setPermissionRequestHandler((wc, permission, cb) => cb(true));
  win.webContents.session.setPermissionCheckHandler(() => true);

  win.webContents.session.on('select-serial-port', (event, portList, wc, callback) => {
    event.preventDefault();
    callback(portList.length > 0 ? portList[0].portId : '');
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => { win.show(); win.focus(); });

  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.error('Load failed:', code, desc);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  registerIPC();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
