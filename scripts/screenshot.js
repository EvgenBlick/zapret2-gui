/**
 * scripts/screenshot.js
 * Launch Electron in headless-like mode, take a screenshot, save it, exit.
 * Usage: node scripts/screenshot.js
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs   = require('fs');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1220, height: 800,
    show: true,
    frame: false,
    webPreferences: {
      preload:          path.join(__dirname, '..', 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'src', 'renderer', 'index.html'));
  await new Promise(r => setTimeout(r, 2000)); // wait for fonts + animations

  // Capture
  const img     = await win.webContents.capturePage();
  const outPath = path.join(__dirname, '..', 'screenshot.png');
  fs.writeFileSync(outPath, img.toPNG());
  console.log('Screenshot saved to:', outPath);

  // Collect console messages
  const msgs = [];
  win.webContents.on('console-message', (_, level, msg) => msgs.push({ level, msg }));
  await new Promise(r => setTimeout(r, 500));

  const errors = msgs.filter(m => m.level >= 2); // warn + error
  if (errors.length) {
    console.warn('=== Renderer Warnings/Errors ===');
    errors.forEach(e => console.warn(`[level ${e.level}] ${e.msg}`));
  } else {
    console.log('=== No renderer errors detected ===');
  }

  app.quit();
});
