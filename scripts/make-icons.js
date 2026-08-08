const fs = require('fs');
const path = require('path');

// 1x1 purple pixel PNG base64
const b64Png = 'iVBORw0KGgoAAAANSU56UhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA3SURBVFhH7c2hAQAgDMTAxP33mR6eYBA5u7Vnd++c2wAvAy8DLwMvAy8DLwMvAy8DLwMvAy8DHwfU/wE5m1a/AAAAAElFTkSuQmCC';

const buf = Buffer.from(b64Png, 'base64');
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

fs.writeFileSync(path.join(assetsDir, 'icon.png'), buf);
fs.writeFileSync(path.join(assetsDir, 'tray.png'), buf);
console.log('Icons generated successfully in assets/');
