// Prism Electron shell. Loads the built web app over a private app:// scheme.
// The renderer is sandboxed with no Node; AI code runs in a Web Worker inside it.
// Only this main process touches the compiler (it plays the "server").
const { app, BrowserWindow, ipcMain, protocol, net, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const webDist = path.join(__dirname, "..", "web", "dist");
const compilerUrl = pathToFileURL(path.join(__dirname, "..", "core", "compiler", "index.js")).href;
let compiler; // loaded on first use (the compiler is an ES module)

protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serveWebDist() {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(webDist, decodeURIComponent(pathname === "/" ? "/index.html" : pathname)));
    if (!file.startsWith(webDist + path.sep)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).href);
  });
}

ipcMain.handle("prism:compile", async (_event, payload) => {
  compiler ??= await import(compilerUrl);
  if (payload && typeof payload.message === "string") {
    return compiler.compileMessage(payload.message, { messageId: payload.id || "msg" });
  }
  return compiler.compile(String(payload?.source ?? ""), { id: payload?.id || "playground" });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 900,
    title: "Prism",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
    },
  });
  // Links and the "open" effect go to the real browser; the app window never navigates away.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith("app://")) e.preventDefault();
  });
  win.loadURL("app://prism/index.html");
  return win;
}

app.whenReady().then(() => {
  serveWebDist();
  createWindow();
  app.on("activate", () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
