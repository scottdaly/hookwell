// Opens the built game in Electron, waits for it to render, captures a PNG, quits. Used to verify the desktop path.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'); const fs = require('node:fs');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1440, height: 900, show: true, backgroundColor: '#e9e2cf', webPreferences: { contextIsolation: true } });
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  await new Promise(r => setTimeout(r, 5000));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(process.argv[2] || 'electron-smoke.png', img.toPNG());
  app.quit();
});
