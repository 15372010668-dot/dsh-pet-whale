const { app, BrowserWindow, ipcMain, screen } = require("electron");
const { join } = require("node:path");

const opts = {};
for (const arg of process.argv) {
  const m = /^--([^=]+)=(.*)$/.exec(arg);
  if (m) opts[m[1]] = m[2];
}
const PORT = Number(opts.port);
const TOKEN = String(opts.token ?? "");
if (!Number.isFinite(PORT) || !TOKEN) {
  console.error("[dsh-pet-whale-overlay] missing --port/--token");
  app.exit(1);
}

app.setPath("userData", join(app.getPath("temp"), "dsh-pet-whale-overlay"));

let win = null;

app.whenReady().then(() => {
  app.dock?.hide();
  const { bounds } = screen.getPrimaryDisplay();
  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "preload.js")
    }
  });
  win.setAlwaysOnTop(true, "screen-saver");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(join(__dirname, "renderer.html"), {
    query: { port: String(PORT), token: TOKEN }
  });
  ipcMain.on("click-through", (_event, value) => {
    if (!win) return;
    win.setIgnoreMouseEvents(!!value, { forward: true });
  });
});

app.on("window-all-closed", () => app.quit());
