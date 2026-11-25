# MassTxt v2.2.0 — Bulk SMS via USB GSM Modem / Android

> Send bulk SMS from Windows using a USB GSM modem or an Android phone — no gateway, no monthly fees, no internet required. Includes Flash on screen (Class 0), Long SMS, a USSD Dial Pad for buying SMS bundles, and all-time accountability reports.

**Current version:** 2.2.0

---

## What Is MassTxt?

MassTxt is an offline Windows desktop app built with Electron. It sends SMS directly through a **USB GSM modem** using AT commands, with an **ADB/Android phone** path as well. Contacts, groups, templates, schedules, and message history are stored locally in IndexedDB — nothing is uploaded to a third-party service.

Perfect for:

- Churches sending service announcements
- Small businesses sending promotions and reminders
- Community groups sending event alerts
- Anyone who needs bulk SMS without API costs

---

## Features

- **USB GSM modem support** — sends via AT commands over serial (`serialport`)
- **Android phone via USB** — ADB-based sending path, no root required
- **Flash on screen (Class 0 FLASH SMS)** — message appears on the recipient's screen instead of their inbox
- **Long SMS** — messages over 160 characters are split into ordered SMS parts
- **USSD Dial Pad** — buy/check SMS bundles with the SIM in your modem or Android phone
- **Accountability** — all-time Sent, Failed and Delivered records with per-recipient detail
- **Bulk sending** with per-contact personalization (`{name}`, `{first}`, `{phone}`)
- **Contacts and groups** — import from Excel/CSV, validate numbers, remove duplicates
- **Message templates** and reusable sender defaults
- **Schedule messages** — the app checks every minute and sends when due
- **Message logs, delivery reports, inbox reading, retries**
- **Runs offline** — no internet connection needed
- **Installer and portable EXE** builds

### What's new in 2.2.0

- Added **Dial Pad** for USSD bundle codes (`*100#`, `*160#`, `*180#`, etc.)
- GSM modem uses `AT+CUSD`; Android opens the dialer with the code prefilled
- Every dial requires confirmation; modem replies are shown in the app
- MTN/Airtel shortcuts are preloaded and editable in Settings
- Compose now has **Long SMS** and **Flash on screen** options beside each other
- **Enter** always adds a new line in the SMS body
- Added all-time **Sent / Failed / Delivered** accountability section in Message Logs
- Network delivery reports (`+CDS`) are recorded when the modem supports them
- Bulk sends now honour the selected Android phone as well as the GSM modem
- Installer now ships as **MassTxt.Setup.2.2.0.exe**

### What's new in 2.1.0

- Added **Flash SMS (Class 0)** with a Compose toggle and configurable default
- Added configurable **Flash SMS data coding** (`240` / `16`) in Settings
- Fixed the send-confirmation bug that silently cancelled every send

---

## Flash SMS

Enable **⚡ Flash on screen** on the Compose page (or make it the default in **Settings → Message defaults**) to send a Class 0 FLASH SMS. It is displayed immediately on the recipient's phone and is not saved to their inbox.

MassTxt sets the GSM DCS before the send and restores normal mode afterward:

```text
AT+CSMP=17,167,0,240     ← class 0, GSM 7-bit
AT+CMGS="+256700000000"
<message>
AT+CSMP=17,167,0,0       ← back to normal SMS
```

Both `240` (`0xF0`) and `16` (`0x10`) are standard DCS values for GSM 7-bit Class 0. If a flash message arrives as a normal SMS, change **Flash SMS data coding** from `240` to `16` in Settings. Some phones and networks ignore Class 0 entirely. Flash SMS requires a GSM modem; Android's public SMS API cannot reliably send Class 0 messages.

---

## Long SMS and Enter key

The **Long SMS** option is next to **Flash on screen** on the Compose page. When it is enabled, messages longer than 160 characters are sent as ordered 153-character parts (the standard GSM concatenation size). When it is disabled, MassTxt stops sends over 160 characters instead of silently splitting them.

Press **Enter** in the SMS body to add a new line. Personalization still works across lines (`{name}`, `{first}`, `{phone}`).

---

## Accountability

Open **Message Logs** to see the all-time accountability section:

- **Sent / accepted** — the modem accepted the message for delivery
- **Failed** — the send failed after all retries; the error is stored per recipient
- **Delivered** — the network returned a `+CDS` delivery confirmation for that recipient
- **All attempts** — every logged recipient record

Each recipient row shows the phone number, message preview, send/delivery time, part count for Long SMS, and failure reason. **Delivered** only fills when the modem/network actually reports delivery; MassTxt does not claim delivery without confirmation.

---

## Dial Pad / USSD bundles

Open **Dial Pad** to buy or check SMS bundles with the SIM inserted in your GSM modem or Android phone.

- **GSM modem:** MassTxt sends `AT+CUSD=1,"*100#",15` and displays the network reply.
- **Android phone:** MassTxt opens the phone dialer with the code prefilled. Press the green call button on the phone to submit it.
- **Saved codes:** Uganda MTN/Airtel defaults are included. Edit labels and codes in **Settings → USSD bundle codes**.
- **Safety:** every dial opens a confirmation dialog. Network charges may apply.

Android cannot reliably read USSD responses through public APIs, so the Android path intentionally hands off to the dialer instead of pretending to read a result.

---

## Requirements

- Windows 10 or 11 (64-bit)
- Either:
  - a USB GSM modem / SIM dongle, or
  - an Android phone with **USB Debugging** enabled and a data cable
- Node.js 18+ (only if building from source)

---

## Quick Start

### Option 1 — Installer (Recommended)

1. Download `MassTxt.Setup.2.2.0.exe` from the [Releases](../../releases) page
2. Run the installer
3. Open MassTxt from the desktop shortcut

### Option 2 — Portable

1. Download `MassTxt-Portable.exe` from [Releases](../../releases)
2. Double-click to run — no installation needed

---

## Setting Up Android (optional)

1. **Settings → About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. **Settings → Developer Options → USB Debugging** — enable it
4. Connect the phone via USB and accept the authorization prompt

---

## Building From Source

```bash
git clone https://github.com/jessethegreat6190/MassTxt.git
cd MassTxt
npm install
npm start          # run the app from source
npm run build      # build installer + portable EXE into dist/
```

On Windows you can also double-click `BUILD-EXE.bat`.

---

## Project Structure

```text
masstxt/
├── main.js              # Electron main process — modem/ADB IPC handlers
├── preload.js           # contextBridge API exposed to the renderer
├── package.json         # Dependencies and electron-builder config
├── package-lock.json
├── BUILD-EXE.bat        # One-click Windows build
├── LICENSE
├── src/
│   ├── index.html       # UI, send logic, flash SMS, scheduling
│   └── styles.css       # App styling
└── assets/
    ├── icon.ico
    └── icon.png
```

---

## How It Works

```text
Contacts / Groups / Templates
            ↓
        MassTxt UI
       ↙        ↘
USB GSM modem   Android phone via ADB
 (AT+CMGS)       (SMS app / provider)
       ↘        ↙
        SMS network
            ↓
        Recipients
```

The GSM modem path uses `AT+CSMP` to set message class, then `AT+CMGS` to submit the message. Normal messages use DCS `0`.

---

## Troubleshooting

**No device detected**

- Plug in the modem/phone and reopen the Devices page
- For Android, confirm USB Debugging is enabled and authorized

**Flash SMS arrives as a normal SMS**

- In Settings, change **Flash SMS data coding** from `240` to `16`
- Some carriers and handsets (notably many iPhones/US carriers) ignore Class 0 messages

**SMS not sending**

- Check SIM signal and airplane mode
- Try a different USB port or data cable

---

## Tech Stack

- [Electron](https://electronjs.org) — desktop framework
- [SerialPort](https://serialport.io) — GSM modem communication
- [ADB](https://developer.android.com/tools/adb) — Android phone communication
- [Bootstrap 5](https://getbootstrap.com) — UI framework
- [SheetJS](https://sheetjs.com) — Excel/CSV import
- [electron-builder](https://www.electron.build) — Windows installer and portable EXE

---

## License

MIT — see [LICENSE](LICENSE).
