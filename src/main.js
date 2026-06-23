// main.js — Electron main process for MatteScreen
//
// Paints a procedural paper-grain texture over every display via a transparent,
// click-through, always-on-top overlay window per monitor. Controlled from a
// macOS-style menu-bar popover panel (with a live slider + texture swatches)
// and a Preferences window.

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  screen,
  ipcMain,
  nativeImage,
  powerMonitor,
} = require("electron");
const path = require("path");
const fs = require("fs");
const { TEXTURES, TEXTURE_ORDER } = require("./textures");

const APP_ICON = path.join(__dirname, "..", "assets", "appicon.png");

// ---------------------------------------------------------------------------
// Settings persistence
// ---------------------------------------------------------------------------
const SETTINGS_PATH = () => path.join(app.getPath("userData"), "settings.json");

const DEFAULT_SETTINGS = {
  enabled: true,
  texture: "classic_matte",
  intensity: 0.22, // 0.15 .. 0.30
  pauseOnBattery: false,
  launchAtLogin: false,
  schedule: { enabled: false, start: "19:00", end: "07:00" },
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH(), "utf8")) };
  } catch (_) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(SETTINGS_PATH(), JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Failed to save settings", err);
  }
}

// Sync the OS "open at login" item with the stored setting (macOS Login Items /
// Windows run-key). openAsHidden starts it quietly in the tray/menu bar.
function applyLoginItem() {
  try {
    app.setLoginItemSettings({ openAtLogin: !!settings.launchAtLogin, openAsHidden: true });
  } catch (err) {
    console.error("Failed to set login item", err);
  }
}

let settings = DEFAULT_SETTINGS;
let overlayWindows = [];
let settingsWindow = null;
let panelWindow = null;
let tray = null;
let snoozeTimer = null;
let scheduleTimer = null;
let snoozedUntil = 0;

// ---------------------------------------------------------------------------
// Overlay windows (one per display)
// ---------------------------------------------------------------------------
function destroyOverlays() {
  for (const w of overlayWindows) if (!w.isDestroyed()) w.destroy();
  overlayWindows = [];
}

function createOverlayForDisplay(display) {
  const { bounds } = display;
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    show: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // "screen-saver" is the highest standard macOS window level. macOS can drop a
  // borderless, non-focusable window behind apps after a Space/focus change, so
  // we re-assert the level whenever the window shows.
  const pinOnTop = () => {
    if (win.isDestroyed()) return;
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  };
  win.__pinOnTop = pinOnTop;
  pinOnTop();
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(__dirname, "renderer", "overlay.html"));
  win.once("ready-to-show", () => {
    pushStateToWindow(win);
    if (isVisibleNow()) {
      win.showInactive();
      pinOnTop();
    }
  });
  return win;
}

function rebuildOverlays() {
  destroyOverlays();
  for (const display of screen.getAllDisplays()) {
    overlayWindows.push(createOverlayForDisplay(display));
  }
}

function withinSchedule() {
  const { start, end } = settings.schedule;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return true;
  if (s < e) return cur >= s && cur < e;
  return cur >= s || cur < e; // overnight
}

function isVisibleNow() {
  if (!settings.enabled) return false;
  if (Date.now() < snoozedUntil) return false;
  if (settings.pauseOnBattery && powerMonitor.isOnBatteryPower && powerMonitor.isOnBatteryPower()) return false;
  if (settings.schedule && settings.schedule.enabled && !withinSchedule()) return false;
  return true;
}

function pushStateToWindow(win) {
  if (win.isDestroyed()) return;
  const tex = TEXTURES[settings.texture] || TEXTURES.classic_matte;
  win.webContents.send("mattescreen:state", { texture: tex, textureKey: settings.texture, intensity: settings.intensity });
}

function applyVisibility() {
  const visible = isVisibleNow();
  for (const win of overlayWindows) {
    if (win.isDestroyed()) continue;
    if (visible) {
      pushStateToWindow(win);
      if (!win.isVisible()) win.showInactive();
      if (typeof win.__pinOnTop === "function") win.__pinOnTop();
    } else if (win.isVisible()) {
      win.hide();
    }
  }
  broadcastUiState();
  updateTray();
}

function refreshAll() {
  for (const win of overlayWindows) pushStateToWindow(win);
  applyVisibility();
}

// ---------------------------------------------------------------------------
// Shared UI state (panel + settings windows)
// ---------------------------------------------------------------------------
function uiState() {
  return { settings, textures: { TEXTURES, TEXTURE_ORDER }, active: isVisibleNow() };
}

function broadcastUiState() {
  for (const w of [panelWindow, settingsWindow]) {
    if (w && !w.isDestroyed()) w.webContents.send("mattescreen:ui", uiState());
  }
}

// ---------------------------------------------------------------------------
// Menu-bar popover panel
// ---------------------------------------------------------------------------
function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: 340,
    height: 470,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  panelWindow.setAlwaysOnTop(true, "pop-up-menu");
  panelWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  panelWindow.loadFile(path.join(__dirname, "renderer", "panel.html"));
  panelWindow.on("blur", () => {
    if (panelWindow && !panelWindow.isDestroyed()) panelWindow.hide();
  });
}

function positionPanel() {
  if (!tray || !panelWindow) return;
  const tb = tray.getBounds();
  const wb = panelWindow.getBounds();
  const disp = screen.getDisplayNearestPoint({ x: tb.x, y: tb.y });
  const wa = disp.workArea;
  let x = Math.round(tb.x + tb.width / 2 - wb.width / 2);
  let y = Math.round(tb.y + tb.height + 6);
  if (y + wb.height > wa.y + wa.height) y = Math.round(tb.y - wb.height - 6); // tray at bottom (Windows)
  x = Math.min(Math.max(x, wa.x + 8), wa.x + wa.width - wb.width - 8);
  y = Math.max(wa.y + 8, y);
  panelWindow.setPosition(x, y, false);
}

function showPanel() {
  if (!panelWindow || panelWindow.isDestroyed()) createPanelWindow();
  panelWindow.webContents.send("mattescreen:ui", uiState());
  positionPanel();
  panelWindow.show();
  panelWindow.focus();
}

function togglePanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    createPanelWindow();
    panelWindow.once("ready-to-show", showPanel);
    return;
  }
  if (panelWindow.isVisible()) panelWindow.hide();
  else showPanel();
}

ipcMain.on("mattescreen:panelHeight", (_evt, h) => {
  if (!panelWindow || panelWindow.isDestroyed()) return;
  const height = Math.max(160, Math.min(900, Math.round(h)));
  const [w] = panelWindow.getSize();
  panelWindow.setSize(w, height, false);
  if (panelWindow.isVisible()) positionPanel();
});

ipcMain.on("mattescreen:closePanel", () => {
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.hide();
});

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
function makeTrayIcon() {
  const iconPath = path.join(__dirname, "..", "assets", "trayTemplate.png");
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      img.setTemplateImage(true); // adapts to light/dark menu bar on macOS
      return img;
    }
  } catch (_) {}
  return nativeImage.createEmpty();
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: isVisibleNow() ? "MatteScreen is active" : "MatteScreen is paused", enabled: false },
    { type: "separator" },
    {
      label: settings.enabled ? "Turn off" : "Turn on",
      click: () => {
        settings.enabled = !settings.enabled;
        snoozedUntil = 0;
        saveSettings();
        applyVisibility();
      },
    },
    { label: "Open controls\u2026", click: showPanel },
    { label: "Settings\u2026", click: openSettingsWindow },
    { type: "separator" },
    { label: "Quit MatteScreen", click: () => app.quit() },
  ]);
}

function updateTray() {
  if (!tray) return;
  tray.setToolTip(isVisibleNow() ? "MatteScreen \u2014 active" : "MatteScreen \u2014 paused");
}

function snooze(minutes) {
  snoozedUntil = Date.now() + minutes * 60 * 1000;
  if (snoozeTimer) clearTimeout(snoozeTimer);
  snoozeTimer = setTimeout(() => {
    snoozedUntil = 0;
    applyVisibility();
  }, minutes * 60 * 1000);
  applyVisibility();
}

// ---------------------------------------------------------------------------
// Preferences window
// ---------------------------------------------------------------------------
function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 460,
    height: 640,
    resizable: false,
    title: "MatteScreen",
    icon: APP_ICON,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#f7f5f0",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.loadFile(path.join(__dirname, "renderer", "settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
ipcMain.handle("mattescreen:getState", () => uiState());
ipcMain.handle("mattescreen:setSettings", (_evt, patch) => {
  settings = { ...settings, ...patch };
  saveSettings();
  applyLoginItem();
  refreshAll();
  return uiState();
});
ipcMain.handle("mattescreen:snooze", (_evt, minutes) => {
  snooze(minutes);
  return uiState();
});
ipcMain.handle("mattescreen:openSettings", () => {
  openSettingsWindow();
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.hide();
});
ipcMain.handle("mattescreen:quit", () => app.quit());

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", showPanel);

  app.whenReady().then(() => {
    settings = loadSettings();
    applyLoginItem();
    if (process.platform === "darwin" && app.dock) app.dock.hide();

    rebuildOverlays();
    createPanelWindow();

    tray = new Tray(makeTrayIcon());
    tray.setToolTip("MatteScreen");
    tray.on("click", togglePanel);
    tray.on("right-click", () => tray.popUpContextMenu(buildTrayMenu()));
    updateTray();

    screen.on("display-added", rebuildOverlays);
    screen.on("display-removed", rebuildOverlays);
    screen.on("display-metrics-changed", rebuildOverlays);

    if (powerMonitor && settings.pauseOnBattery) {
      powerMonitor.on("on-battery", applyVisibility);
      powerMonitor.on("on-ac", applyVisibility);
    }

    scheduleTimer = setInterval(applyVisibility, 60 * 1000); // schedule + re-pin
  });
}

app.on("window-all-closed", (e) => {
  e.preventDefault(); // keep running in the tray / menu bar
});

app.on("before-quit", () => {
  if (scheduleTimer) clearInterval(scheduleTimer);
  if (snoozeTimer) clearTimeout(snoozeTimer);
});
