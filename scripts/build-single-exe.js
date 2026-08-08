/**
 * scripts/build-single-exe.js
 * Compiles the entire Electron app + zapret2 binaries into ONE Single Portable .exe file
 * using C# csc.exe (built-in Windows compiler) & Administrator manifest.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir    = path.join(__dirname, '..');
const distDir    = path.join(rootDir, 'dist');
const buildTmp   = path.join(rootDir, 'build_tmp');
const appDir     = path.join(buildTmp, 'Zapret2 Manager-win32-x64');
const zipPath    = path.join(distDir, 'payload.zip');
const csPath     = path.join(distDir, 'Launcher.cs');
const exePath    = path.join(distDir, 'Zapret2Manager-Standalone.exe');
const cscExe     = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const z7za       = path.join(rootDir, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

console.log('=== Step 1: Cleaning and Packaging Electron App ===');
try { execSync('taskkill /F /IM "Zapret2 Manager.exe" 2>nul', { stdio: 'ignore' }); } catch(_) {}
try { execSync('taskkill /F /IM winws2.exe 2>nul', { stdio: 'ignore' }); } catch(_) {}
try { execSync('taskkill /F /IM electron.exe 2>nul', { stdio: 'ignore' }); } catch(_) {}

if (fs.existsSync(buildTmp)) {
  try { fs.rmSync(buildTmp, { recursive: true, force: true }); } catch(_) {}
}
const distAppDir = path.join(distDir, 'Zapret2 Manager-win32-x64');

execSync(
  'npx -y @electron/packager . "Zapret2 Manager" --platform=win32 --arch=x64 --out=build_tmp --overwrite --electron-version=31.7.7 --asar --extra-resource=bin --extra-resource=assets --ignore="dist|build_tmp|\\.git|scripts"',
  { cwd: rootDir, stdio: 'inherit' }
);

console.log('=== Step 1.5: Copying fresh build to dist/Zapret2 Manager-win32-x64 ===');
try {
  execSync(`robocopy "${appDir}" "${distAppDir}" /MIR /NJH /NJS /NC /NS /NP`, { stdio: 'ignore' });
} catch (e) {
  try { fs.cpSync(appDir, distAppDir, { recursive: true, force: true }); } catch(_) {}
}

console.log('=== Step 2: Compressing payload into ZIP via 7za ===');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

execSync(`"${z7za}" a -tzip "${zipPath}" "${appDir}\\*"`, { stdio: 'inherit' });

console.log(`ZIP created: ${zipPath} (${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB)`);

console.log('=== Step 3: Generating C# Standalone Launcher ===');

const csCode = `
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Security.Principal;

namespace Zapret2Launcher
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                string tempDir = Path.Combine(Path.GetTempPath(), "Zapret2Manager_Portable");
                string exePath = Path.Combine(tempDir, "Zapret2 Manager.exe");

                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream stream = asm.GetManifestResourceStream("payload.zip"))
                {
                    if (stream != null)
                    {
                        if (Directory.Exists(tempDir))
                        {
                            try { Directory.Delete(tempDir, true); } catch { }
                        }
                        Directory.CreateDirectory(tempDir);

                        string tempZip = Path.Combine(tempDir, "payload.zip");
                        using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                        {
                            stream.CopyTo(fs);
                        }

                        ZipFile.ExtractToDirectory(tempZip, tempDir);
                        try { File.Delete(tempZip); } catch { }
                    }
                }

                if (!File.Exists(exePath))
                {
                    Console.WriteLine("Error: Could not locate Zapret2 Manager.exe in " + tempDir);
                    return;
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exePath;
                psi.WorkingDirectory = tempDir;
                psi.UseShellExecute = true;

                if (!IsAdmin())
                {
                    psi.Verb = "runas";
                }

                Process.Start(psi);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Launcher Error: " + ex.Message);
            }
        }

        static bool IsAdmin()
        {
            try
            {
                WindowsIdentity id = WindowsIdentity.GetCurrent();
                WindowsPrincipal principal = new WindowsPrincipal(id);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }
    }
}
`;

fs.writeFileSync(csPath, csCode, 'utf8');

console.log('=== Step 4: Compiling Standalone EXE using csc.exe ===');
if (fs.existsSync(exePath)) fs.unlinkSync(exePath);

const manifestPath = path.join(rootDir, 'scripts', 'app.manifest');
const cscCmd = `"${cscExe}" /nologo /out:"${exePath}" /target:winexe /win32manifest:"${manifestPath}" /resource:"${zipPath}",payload.zip /reference:System.IO.Compression.FileSystem.dll /reference:System.IO.Compression.dll "${csPath}"`;
execSync(cscCmd, { stdio: 'inherit' });

// Cleanup temp build files
try { fs.unlinkSync(zipPath); } catch(_) {}
try { fs.unlinkSync(csPath); } catch(_) {}
try { fs.rmSync(buildTmp, { recursive: true, force: true }); } catch(_) {}

console.log('====================================================');
console.log('🎉 SINGLE STANDALONE EXE SUCCESSFULLY CREATED!');
console.log('File:', exePath);
console.log('Size:', (fs.statSync(exePath).size / 1024 / 1024).toFixed(2), 'MB');
console.log('====================================================');
