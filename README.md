# MatteScreen

A free, open-source desktop overlay that makes your screen feel like paper. It
paints a soft, procedural paper-grain texture over your whole screen to take the
glare and harsh contrast out of everything you do. A free alternative to
[Paperman](https://paperman.cc/).

**[Download for macOS (DMG)](https://github.com/Shane12344321/MatteScreen/releases/latest/download/MatteScreen-1.0.0.dmg)**

- **Cross-platform** — Windows, macOS, and Linux (Electron).
- **Click-through** — the overlay floats above every app; your clicks, scrolls
  and keystrokes pass straight through. It never takes focus.
- **All monitors** — one overlay per display, and it follows monitors as you add
  or remove them.
- **Not a blue-light filter** — it changes screen *texture*, not color
  temperature. Works alongside Night Shift / f.lux.
- **Procedural grain** — generated with SVG `feTurbulence`, so the texture stays
  crisp at any resolution. No image assets, tiny footprint.

## Textures

Switchable from the tray or the settings window:

| Texture | Feel |
| --- | --- |
| **Classic Matte** | Smooth, diffused finish for focused reading. |
| **Whisper Weave** | Delicate fabric grain that cuts screen glare. |
| **Sunbaked Parchment** | Warm amber wash for cozy late-night sessions. |
| **Saddle Linen** | Coarse, earthy linen weave. |
| **Vellum Mist** | Soft, semi-translucent frosted haze. |

Intensity is adjustable from 15% to 30%.

## Features

- System tray menu: toggle, pick texture, set intensity, snooze (5/15/60 min).
- Settings window: texture, intensity slider, pause-on-battery, schedule.
- Schedule: only run between set hours (supports overnight windows).
- Single-instance: launching again opens settings instead of a second copy.

## Run it (development)

You need [Node.js](https://nodejs.org/) 18+ installed.

```bash
cd mattescreen
npm install      # downloads Electron
npm start        # launches the overlay + tray
```

When it starts you'll see the paper texture across your screen and a MatteScreen
icon in your system tray / menu bar. Right-click (or click) it for the menu.

## Build installers

```bash
npm run dist          # build for your current OS
npm run dist:win      # Windows (.exe / portable)
npm run dist:mac      # macOS (.dmg / .zip)
npm run dist:linux    # Linux (AppImage)
```

Built artifacts land in `dist/`.

## How it works

Each display gets a transparent, frameless, always-on-top `BrowserWindow` with
`setIgnoreMouseEvents(true)` so it's fully click-through, and
`setAlwaysOnTop(win, "screen-saver")` + `setVisibleOnAllWorkspaces` so it floats
above full-screen apps. The window renders an SVG `feTurbulence` filter over a
full-screen `<rect>`, blended onto your screen with `mix-blend-mode: multiply`
(or `overlay` / `soft-light` depending on the texture). The grain parameters and
opacity come from `src/textures.js`.

## Project layout

```
src/
  main.js              Electron main: windows, tray, settings, scheduling
  preload.js           contextBridge between renderer and main
  textures.js          Texture definitions (shared)
  renderer/
    overlay.html/js    The full-screen grain overlay
    settings.html/js   The settings window
assets/
  trayTemplate.png     Tray icon
```

## Ideas / roadmap

- Per-app exclusion list (skip the overlay for Photoshop, video players, etc.).
- Sunrise/sunset-based circadian schedule.
- More textures (cold-press, felt, carbon ledger).
- Launch-at-login.

## License

MIT — do anything you like. Not affiliated with Paperman.
