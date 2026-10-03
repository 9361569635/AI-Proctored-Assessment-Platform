# Secure Exam Desktop

A locked-down Electron shell that loads the candidate assessment (the same
`frontend/` web app, at `/candidate/system-check`) in a full-screen kiosk
window on a managed exam-center machine. It is optional — the platform works
fully in an ordinary browser via `frontend/src/components/ProctoringMonitor.tsx`
— but exam centers that control the device can use this for a stricter
lockdown than a browser tab can offer.

## What it adds over a plain browser tab

Most anti-cheat signals (tab switch, window blur, fullscreen exit, copy/
paste attempts) already work correctly inside this app for free, because
it's the same Chromium engine the browser uses, running the same
`ProctoringMonitor` component. What this shell adds on top:

- **Kiosk lockdown**: full-screen, no window chrome/menu bar, no taskbar
  escape via minimize/close, navigation locked to the configured origin,
  new windows/popups blocked.
- **Real DevTools detection** (`DEV_TOOLS_OPEN`) — a web page cannot reliably
  detect an attached DevTools/remote-debugger; the shell can, and closes it
  automatically.
- **External/second monitor detection** — reported as `CAPABILITY_FAILURE`
  with `reason: "multiple_displays_detected"`, since a web page can't see
  monitors outside its own window.
- **PrintScreen interception** on platforms that support it, plus clipboard
  clearing.
- **Screen-capture resistance** via `setContentProtection(true)` (blanks the
  window in many recording/capture tools — support varies by OS/tool).
- **Locked camera/mic permission handling** — auto-grants only camera,
  microphone, and fullscreen to the configured origin; silently denies
  everything else (geolocation, notifications, etc.) rather than showing an
  OS prompt the candidate could exploit or simply dismiss.
- **A safety valve**: an emergency proctor-override unlock, and a graceful
  unlock when the candidate reaches their result page — so this can't turn
  into a machine a proctor has to force-quit or an assessment.

All of this is forwarded to the *same* backend proctoring pipeline
(`backend/src/proctoring`) via the web app's existing, authenticated
`reportProctoringEvent()` calls — the shell never talks to the API directly
or handles credentials itself. See
`frontend/src/components/ProctoringMonitor.tsx` for the subscription and
`preload.js` for what's exposed to the page as `window.secureExamDesktop`.

## What this can and cannot guarantee

Be upfront with candidates and stakeholders about this:

- **Alt+Tab / Cmd+Tab, the Windows key, Mission Control, and virtual-desktop
  switching are reserved by the OS window manager.** No Electron app (or
  almost any third-party app) can intercept them. True "cannot leave this
  app at all" lockdown requires an OS-level kiosk feature configured by the
  exam center on top of this app — Windows Assigned Access, macOS Guided
  Access, or a managed Chromebook/Linux kiosk profile.
- **A second physical device (a phone on the desk) is not something any
  desktop app or browser can see.** That's what the webcam-based
  `ProctoringMonitor` (face/phone detection) is for, not this shell.
- **Screen-capture resistance is best-effort.** `setContentProtection`
  works against many common capture/recording tools but not all, and not
  identically across Windows/macOS/Linux.
- **On macOS, the system menu bar's Quit item and Force Quit (via Activity
  Monitor) cannot be removed by any app**, including this one; `Cmd+Q` is
  intercepted here, but a determined user with admin access to the machine
  can still force-quit the process. This is a `ulimit`-style ceiling of the
  platform, not a bug in this app.

Use this shell on machines the exam center actually controls, alongside
webcam proctoring and organizational device policy — not as a substitute
for either.

## Configuration

Configuration is resolved in this order: environment variables → an
optional `config.json` next to the app → built-in defaults. Copy
`config.example.json` to `config.json` to configure without touching
environment variables (useful for non-technical exam-center staff).

| Env var                      | config.json key | Default                                              | Purpose |
|-------------------------------|------------------|-------------------------------------------------------|---------|
| `ASSESSMENT_URL`              | `assessmentUrl`  | `http://localhost:5173/candidate/system-check`         | Page loaded on launch |
| `ALLOWED_ORIGIN`               | `allowedOrigin`  | derived from `ASSESSMENT_URL`                          | Navigation/permission origin allow-list |
| `ORG_NAME`                     | `orgName`        | `AI Assessment Platform`                               | Cosmetic only (window title) |
| `SECURE_EXAM_OVERRIDE_CODE`   | `overrideCode`   | *(none — override disabled)*                           | Proctor emergency-unlock code |

**Rotate `overrideCode` per exam window and treat it as an operational
safety valve, not a cryptographic secret** — it's compared in plain text and
is meant for supervised exam-center staff, not for candidates.

## Run in development

```bash
npm install
ASSESSMENT_URL=http://localhost:5173/candidate/system-check npm run dev
```

`npm run dev` sets `NODE_ENV=development`, which disables kiosk/fullscreen/
always-on-top and re-enables DevTools so you can iterate normally. Run the
backend and frontend dev servers first (see the repo root `README.md`).

## Run in "production mode" without packaging

```bash
npm install
ASSESSMENT_URL=https://exam.example.com/candidate/system-check \
ALLOWED_ORIGIN=https://exam.example.com \
SECURE_EXAM_OVERRIDE_CODE=<per-session-code> \
npm start
```

## Build installers

```bash
npm install
npm run dist:win     # NSIS installer for Windows (x64)
npm run dist:mac     # DMG for macOS (x64 + arm64) — build on a Mac
npm run dist:linux   # AppImage for Linux (x64)
npm run dist         # all three, where the host platform allows
```

Output lands in `dist/`. Notes:

- **Icons**: no custom app icon is bundled, so electron-builder falls back
  to its default Electron icon. To brand it, add `build/icon.ico` (Windows),
  `build/icon.icns` (macOS), and `build/icon.png` (512×512, Linux), then
  reference them under `build.win.icon` / `build.mac.icon` /
  `build.linux.icon` in `package.json`.
- **macOS code signing/notarization**: `hardenedRuntime` and camera/
  microphone entitlements (`build/entitlements.mac.plist`) are already
  configured so a signed build's camera/mic access works. Unsigned builds
  will still run locally but macOS Gatekeeper will warn on first launch;
  set `CSC_LINK`/`CSC_KEY_PASSWORD` (or `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`
  for notarization) as usual for electron-builder if you have a Developer ID.
- **Windows code signing**: unsigned builds work but trigger a SmartScreen
  warning; set `CSC_LINK`/`CSC_KEY_PASSWORD` if you have a code-signing
  certificate.

## Troubleshooting

- **Camera/mic permission dialog never appears / access silently fails on
  macOS**: only happens on an *unsigned* dev build in rare cases — packaged,
  signed builds pick up the entitlements automatically. As a workaround in
  dev, grant "System Settings → Privacy & Security → Camera/Microphone"
  access to the Electron binary manually once.
- **Window is stuck locked with nothing responding**: press
  `Ctrl/Cmd+Alt+Shift+X` for the proctor override dialog (requires
  `SECURE_EXAM_OVERRIDE_CODE`/`overrideCode` to be set — if it isn't, the
  app tells you so instead of silently doing nothing).
- **Local troubleshooting log**: written to `secure-exam.log` under the
  app's user-data directory (`app.getPath('userData')` — e.g.
  `%APPDATA%/ai-assessment-secure-exam` on Windows, `~/Library/Application
  Support/ai-assessment-secure-exam` on macOS, `~/.config/ai-assessment-secure-exam`
  on Linux). This is a local support aid only — it is not the proctoring
  record of truth; that's whatever reached `/api/proctoring/event`.
