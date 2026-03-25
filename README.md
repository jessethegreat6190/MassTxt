# MassTxt — Bulk SMS via Android Phone (USB)

> Send bulk SMS messages to hundreds of contacts using your Android phone connected via USB — no SIM card API, no monthly fees, no internet required.

---

## What Is MassTxt?

MassTxt is a Windows desktop application built with Electron that lets you send bulk SMS messages directly through an Android phone connected via USB. It uses ADB (Android Debug Bridge) to communicate with the phone, read contacts, and send messages — all without any third-party SMS gateway or subscription.

Perfect for:
- Churches sending service announcements
- Small businesses sending promotions
- Community groups sending event reminders
- Anyone needing affordable bulk SMS without API costs

---

## Features

- **Connect any Android phone via USB** — uses ADB, no root required
- **Send bulk SMS** to multiple contacts at once
- **Import contacts** directly from your Android phone
- **Read SMS inbox** from connected phone
- **Excel/CSV import** — paste your contact list from a spreadsheet
- **Multiple send methods** with automatic fallback
- **Runs offline** — no internet connection needed
- **Portable .exe** — run from a USB drive, no installation needed

---

## Requirements

- Windows 10 or 11 (64-bit)
- Android phone with **USB Debugging enabled**
- USB cable (data cable, not charge-only)
- Node.js (only if building from source)

---

## Quick Start

### Option 1 — Run the Installer (Recommended)
1. Download `MassTxt-Setup.exe` from the [Releases](../../releases) page
2. Run the installer
3. Open MassTxt from your desktop shortcut

### Option 2 — Portable Version
1. Download `MassTxt-Portable.exe` from the [Releases](../../releases) page
2. Double-click to run — no installation needed

---

## Setting Up Your Android Phone

Before using MassTxt you need to enable USB Debugging on your phone:

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times to unlock Developer Options
3. Go to **Settings → Developer Options**
4. Enable **USB Debugging**
5. Connect your phone to your PC via USB
6. When prompted on your phone tap **Allow** to authorize the PC

---

## Building From Source

```bash
# Clone the repository
git clone https://github.com/jessethegreat6190/MassTxt.git
cd MassTxt

# Install dependencies
npm install

# Run in development mode
npm start

# Build Windows installer
npm run build

# Or just double-click
BUILD-EXE.bat
```

---

## Project Structure

```
masstxt/
├── main.js          # Electron main process — ADB logic
├── preload.js       # Context bridge — exposes API to renderer
├── package.json     # App config and build settings
├── BUILD-EXE.bat    # One-click Windows build script
├── src/
│   └── index.html   # Frontend UI
└── assets/
    ├── icon.ico     # App icon
    └── adb/
        └── adb.exe  # ADB binary (bundled)
```

---

## How It Works

```
Your Contact List
      ↓
MassTxt App
      ↓
ADB (USB)
      ↓
Android Phone
      ↓
SMS Network
      ↓
Recipients
```

MassTxt uses three SMS sending methods with automatic fallback:
1. **Direct ISMS service call** — fastest, works on most Android devices
2. **Intent broadcast** — opens SMS app and auto-sends
3. **Content provider** — inserts directly into SMS database

---

## Troubleshooting

**Phone not detected?**
- Make sure USB Debugging is enabled
- Try a different USB cable (must be data cable)
- Accept the "Allow USB Debugging" prompt on your phone
- Try `adb devices` in Command Prompt to verify connection

**SMS not sending?**
- Make sure your phone has signal
- Check that the phone is not in airplane mode
- Try disconnecting and reconnecting the USB cable

---

## Tech Stack

- [Electron](https://electronjs.org) — Desktop app framework
- [ADB](https://developer.android.com/tools/adb) — Android Debug Bridge
- [Bootstrap 5](https://getbootstrap.com) — UI framework
- [SheetJS](https://sheetjs.com) — Excel/CSV import

---

## Contributing

Pull requests are welcome! For major changes please open an issue first to discuss what you would like to change.

---

## License

MIT — see [LICENSE](LICENSE) file for details.
