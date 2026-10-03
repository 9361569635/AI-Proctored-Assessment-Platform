const {
  app,
  BrowserWindow,
  session,
  globalShortcut,
  screen,
  ipcMain,
  Menu,
  clipboard,
  dialog,
} = require("electron");
const path = require("path");
const { loadConfig } = require("./src/config");
const { createLogger } = require("./src/logger");

const isDev = process.env.NODE_ENV === "development";
const config = loadConfig();

// Renderer-hostile flags matter for exam timers: without these, Chromium
// throttles JS timers in a backgrounded/minimized window, which would skew
// the candidate's countdown display relative to the server's authoritative
// clock (server remains the source of truth either way — see
// backend/src/assessment/sessionAccess.ts — but a frozen local timer is a
// bad candidate experience and looks like a bug).
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

const { log, logPath } = createLogger(app.getPath("userData"));

// --- Single instance -------------------------------------------------------
// A second launch (double-clicking the icon again, a candidate trying to
// "restart" their way out of a violation banner) must not spawn a second
// unlocked window next to the locked one.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

let mainWindow = null;
let overrideWindow = null;
let examUnlocked = false; // set true only via a successful graceful exit or override

function isAllowedUrl(urlString) {
  try {
    return new URL(urlString).origin === new URL(config.allowedOrigin).origin;
  } catch {
    return false;
  }
}

function sendNativeViolation(eventType, metadata) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("secure-exam:violation", { eventType, metadata });
  log("violation", { eventType, metadata });
}

function reportDisplayState() {
  const displays = screen.getAllDisplays();
  if (displays.length > 1) {
    // Not one of the browser-detectable events (a web page can't see a
    // second monitor), so this is genuinely additive over the existing
    // browser-side ProctoringMonitor. Mapped onto CAPABILITY_FAILURE since
    // the backend's proctoring event enum doesn't have a dedicated
    // multi-monitor type (see backend/src/proctoring/proctoringConfig.ts).
    sendNativeViolation("CAPABILITY_FAILURE", {
      reason: "multiple_displays_detected",
      displayCount: displays.length,
      source: "secure-exam-desktop",
    });
  }
}

function buildPermissionHandler() {
  // Auto-grant only what the assessment actually needs, only for the
  // configured origin, and silently deny everything else (geolocation,
  // notifications, MIDI, HID, etc.) rather than showing OS prompts a
  // candidate could dismiss or that could leak information.
  return (webContents, permission, callback) => {
    const requestingUrl = webContents.getURL();
    const allowed =
      isAllowedUrl(requestingUrl) && ["media", "fullscreen", "display-capture"].includes(permission);
    callback(allowed);
  };
}

function createOfflineFallback(win) {
  win.loadFile(path.join(__dirname, "src", "offline.html"));
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    fullscreen: true,
    kiosk: !isDev,
    frame: isDev,
    autoHideMenuBar: true,
    alwaysOnTop: !isDev,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: isDev,
    },
  });

  Menu.setApplicationMenu(null);
  win.setMenuBarVisibility(false);

  // Block window.open()/target=_blank entirely — there is no legitimate
  // reason for the exam page to spawn a second window.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Restrict top-level navigation to the configured origin (prevents a
  // compromised or misconfigured page from redirecting the candidate to an
  // arbitrary site while still full-screen and looking "official").
  win.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) {
      event.preventDefault();
      log("blocked-navigation", { url });
    }
  });

  win.webContents.on("did-fail-load", (_event, errorCode, _desc, validatedURL) => {
    if (errorCode === -3) return; // ERR_ABORTED — usually a deliberate redirect, not a real failure
    log("load-failed", { errorCode, url: validatedURL });
    createOfflineFallback(win);
  });

  // Keep DevTools closed in production even if opened via remote debugging
  // or a keyboard combo we failed to intercept below.
  win.webContents.on("devtools-opened", () => {
    if (!isDev) {
      win.webContents.closeDevTools();
      sendNativeViolation("DEV_TOOLS_OPEN", { source: "secure-exam-desktop" });
    }
  });

  // Kiosk mode should not be exitable via OS window-manager gestures, but
  // some platforms/window managers can still pop it out (e.g. a user with
  // accessibility shortcuts enabled). Snap straight back rather than
  // leaving the candidate in a small, movable window mid-exam.
  win.on("leave-full-screen", () => {
    if (!examUnlocked && !isDev) {
      win.setFullScreen(true);
    }
  });

  win.on("close", (event) => {
    if (!examUnlocked) {
      event.preventDefault();
      log("blocked-close-attempt");
    }
  });

  // Block the most common escape/inspection key combinations at the input
  // level as a second layer under the globalShortcut registrations below
  // (before-input-event only fires while this window has focus, whereas
  // globalShortcut fires system-wide — the two cover different gaps).
  win.webContents.on("before-input-event", (event, input) => {
    const key = (input.key || "").toLowerCase();
    const combo = `${input.control || input.meta ? "cmdorctrl+" : ""}${input.alt ? "alt+" : ""}${input.shift ? "shift+" : ""}${key}`;
    const blocked = new Set([
      "f11",
      "f12",
      "cmdorctrl+shift+i",
      "cmdorctrl+shift+j",
      "cmdorctrl+shift+c",
      "cmdorctrl+u",
      "cmdorctrl+p",
      "cmdorctrl+n",
      "cmdorctrl+w",
      "cmdorctrl+r",
      "f5",
    ]);
    if (!isDev && blocked.has(combo)) {
      event.preventDefault();
    }
  });

  win.loadURL(config.assessmentUrl);
  return win;
}

function registerGlobalShortcuts() {
  // Best-effort only. Alt+Tab / Cmd+Tab / the Windows key / Mission Control
  // are reserved by the OS window manager and cannot be intercepted by any
  // Electron app (or almost any third-party app) on Windows or macOS — this
  // is a platform limitation, not a bug here. Real "can't leave this app at
  // all" lockdown requires OS-level kiosk features (Windows Assigned
  // Access / "kiosk mode", macOS Guided Access, or a managed Chromebook/
  // Linux kiosk profile) configured by the exam center on top of this app.
  // See README.md → "What this can and cannot guarantee".
  const combos = [
    "CommandOrControl+Shift+I",
    "CommandOrControl+Shift+J",
    "CommandOrControl+Shift+C",
    "F12",
    "F11",
    "CommandOrControl+P",
    "CommandOrControl+N",
    "CommandOrControl+Q",
    "CommandOrControl+W",
    "CommandOrControl+M",
    "CommandOrControl+H",
    "Alt+F4",
    "PrintScreen",
  ];
  for (const combo of combos) {
    try {
      globalShortcut.register(combo, () => {
        if (combo === "PrintScreen") {
          sendNativeViolation("CAPABILITY_FAILURE", { reason: "print_screen_key_pressed" });
          clipboard.clear();
        }
        // Intentional no-op for everything else: registering the shortcut
        // is what prevents the OS from acting on it while this is the
        // active app; we don't need to do anything further.
      });
    } catch (err) {
      log("shortcut-register-failed", { combo, message: err.message });
    }
  }

  // Proctor-only emergency unlock — the one deliberate way out of kiosk
  // mode short of killing the process, so a genuinely stuck exam machine
  // doesn't require support staff to force-quit and lose the local log.
  globalShortcut.register("CommandOrControl+Alt+Shift+X", () => {
    openOverrideDialog();
  });
}

function openOverrideDialog() {
  if (!config.overrideCode) {
    dialog.showErrorBox(
      "Override not configured",
      "No SECURE_EXAM_OVERRIDE_CODE / overrideCode is set for this deployment, so the emergency unlock is disabled. Contact the platform administrator."
    );
    return;
  }
  if (overrideWindow) {
    overrideWindow.focus();
    return;
  }
  overrideWindow = new BrowserWindow({
    width: 380,
    height: 260,
    parent: mainWindow || undefined,
    modal: true,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "src", "overlay", "override-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  overrideWindow.setMenuBarVisibility(false);
  overrideWindow.loadFile(path.join(__dirname, "src", "overlay", "override.html"));
  overrideWindow.on("closed", () => {
    overrideWindow = null;
  });
}

ipcMain.on("override:submit", (_event, code) => {
  const ok = typeof code === "string" && config.overrideCode && code === config.overrideCode;
  if (ok) {
    log("override-success");
    examUnlocked = true;
    globalShortcut.unregisterAll();
    if (overrideWindow) overrideWindow.close();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
    }
  } else {
    log("override-failed");
    if (overrideWindow) overrideWindow.webContents.send("override:result", false);
  }
});

ipcMain.on("override:cancel", () => {
  if (overrideWindow) overrideWindow.close();
});

// Renderer-initiated unlock — called by the web app once the candidate has
// submitted and reached the result screen. This releases kiosk/fullscreen
// and re-enables the window's own close button so the candidate can read
// their result and close the app in their own time, rather than either
// staying trapped in a locked kiosk window or being force-quit out from
// under the result they just earned the right to see.
ipcMain.on("secure-exam:exit", (_event, reason) => {
  log("unlocked-for-exit", { reason });
  examUnlocked = true;
  globalShortcut.unregisterAll();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setKiosk(false);
    mainWindow.setFullScreen(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setContentProtection(false);
  }
});

ipcMain.handle("secure-exam:get-display-count", () => screen.getAllDisplays().length);
ipcMain.handle("secure-exam:get-log-path", () => logPath);

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler(buildPermissionHandler());
  session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) =>
    isAllowedUrl(origin) && ["media", "fullscreen", "display-capture"].includes(permission)
  );

  // Tag every request so the backend/CDN can distinguish desktop-shell
  // traffic from an ordinary browser if that's ever useful for support or
  // analytics. Not used for authentication or authorization.
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["X-Secure-Exam-Mode"] = "1";
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  mainWindow = createMainWindow();
  registerGlobalShortcuts();
  reportDisplayState();
  screen.on("display-added", reportDisplayState);
  screen.on("display-removed", reportDisplayState);

  // Content protection blanks the window in most screen-capture/recording
  // tools (support varies by OS/capture tool — see README limitations).
  if (!isDev) {
    mainWindow.setContentProtection(true);
  }

  log("app-started", { assessmentUrl: config.assessmentUrl, allowedOrigin: config.allowedOrigin });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
