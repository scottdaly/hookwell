// Hookwell desktop wrapper. Loads the built game from dist/ (run `npm run build` first),
// or the Vite dev server if HW_DEV is set.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: 'Hookwell', backgroundColor: '#e9e2cf',
    webPreferences: { contextIsolation: true },
  });
  win.setMenuBarVisibility(false);
  if (process.env.HW_DEV) win.loadURL('http://localhost:5177/');
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { app.quit(); });
