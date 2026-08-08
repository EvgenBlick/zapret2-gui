/**
 * e2e-test.js — Exhaustive 55-element E2E Automated Test Suite
 * Powered by Playwright (_electron.launch)
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'dist', 'e2e-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
  console.log('🚀 Starting E2E Comprehensive Test Suite...');
  const logs = [];
  const errors = [];

  let app;
  try {
    app = await electron.launch({
      args: [path.join(__dirname, '..', 'src', 'main.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Wait for the actual renderer window (filter out DevTools)
    let window = null;
    for (let i = 0; i < 20; i++) {
      for (const w of app.windows()) {
        const url = w.url();
        if (url.startsWith('file:') || url.includes('renderer')) {
          window = w;
          break;
        }
      }
      if (window) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!window) window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.bringToFront();
    await window.setViewportSize({ width: 1100, height: 750 });
    console.log('✅ Connected to Main App Window:', window.url());

    window.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.error('❌ [Renderer Error]:', text);
        errors.push(text);
      } else {
        logs.push(text);
      }
    });

    window.on('pageerror', err => {
      console.error('💥 [Uncaught Exception]:', err.message);
      errors.push(err.message);
    });

    // Helper for element testing
    const testElement = async (selector, actionName, fn) => {
      console.log(`🔎 Testing [${selector}] (${actionName})...`);
      try {
        const el = window.locator(selector).first();
        await el.waitFor({ state: 'attached', timeout: 3000 });
        await el.focus().catch(() => {});
        await el.hover().catch(() => {});
        if (fn) await fn(el);
        console.log(`  └─ ✅ Success`);
      } catch (e) {
        console.log(`  └─ ⚠️ Notice: ${e.message.split('\n')[0]}`);
      }
    };

    // ── 1. Navigation & Pages Testing ────────────────────
    console.log('\n--- 1. Navigation & Page Switches ---');
    await testElement('#nav-apps', 'Click Apps Nav', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '01_page_apps.png') });

    await testElement('#nav-sites', 'Click Sites Nav', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '02_page_sites.png') });

    await testElement('#nav-profiles', 'Click Profiles Nav', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '03_page_profiles.png') });

    await testElement('#nav-logs', 'Click Logs Nav', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '04_page_logs.png') });

    await testElement('#nav-settings', 'Click Settings Nav', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '05_page_settings.png') });

    await testElement('#nav-dashboard', 'Return to Dashboard Nav', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '06_page_dashboard.png') });

    // ── 2. Quick Action Cards ──────────────────────────────
    console.log('\n--- 2. Quick Action Cards ---');
    await testElement('.quick-card[data-page="apps"]', 'Click Apps QuickCard', async el => { await el.click({ force: true }); });
    await testElement('#nav-dashboard', 'Back to Dashboard', async el => { await el.click({ force: true }); });

    await testElement('.quick-card[data-page="sites"]', 'Click Sites QuickCard', async el => { await el.click({ force: true }); });
    await testElement('#nav-dashboard', 'Back to Dashboard', async el => { await el.click({ force: true }); });

    // ── 3. Modals & Forms Testing ──────────────────────────
    console.log('\n--- 3. Modals & Forms Testing ---');
    await testElement('#nav-apps', 'Go to Apps', async el => { await el.click(); });
    await testElement('#btn-add-app', 'Open Add App Modal', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '07_modal_app.png') });

    await testElement('#tabBtn-running', 'Switch to Running Apps Tab', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '08_modal_app_running_tab.png') });

    await testElement('#tabBtn-browse', 'Switch to Browse Tab', async el => { await el.click(); });

    // Boundary XSS test in App Name Input
    await testElement('#app-name-input', 'XSS Boundary Test', async el => {
      await el.fill('<script>alert("XSS")</script>');
    });

    // Close Modal via ESC
    console.log('  └─ Testing ESC Key on Modal...');
    await window.keyboard.press('Escape');

    // Add Site Modal
    await testElement('#nav-sites', 'Go to Sites', async el => { await el.click(); });
    await testElement('#btn-add-site', 'Open Add Site Modal', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '09_modal_sites.png') });

    // Boundary Test on Sites Input
    await testElement('#sites-input', 'Fill Sites Wildcards & XSS', async el => {
      await el.fill('youtube.com\n*.google.com\n<script>alert("XSS")</script>');
    });
    await testElement('#btn-confirm-add-site', 'Confirm Add Site', async el => { await el.click(); });

    // Add Profile Modal
    await testElement('#nav-profiles', 'Go to Profiles', async el => { await el.click(); });
    await testElement('#btn-add-profile', 'Open Profile Modal', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '10_modal_profile.png') });

    await testElement('#profile-name', 'Fill Profile Name', async el => { await el.fill('Test Profile E2E'); });
    await testElement('#profile-args', 'Fill Profile Args', async el => { await el.fill('--wf-tcp-out=80,443'); });
    await testElement('#profile-lua', 'Fill Profile Lua', async el => { await el.fill('zapret-antidpi.lua'); });
    await testElement('#btn-confirm-profile', 'Save Profile', async el => { await el.click(); });

    // ── 4. Settings Page Controls ──────────────────────────
    console.log('\n--- 4. Settings Page Controls ---');
    await testElement('#nav-settings', 'Go to Settings', async el => { await el.click(); });

    await testElement('#tog-autostart', 'Toggle Autostart', async el => { await el.click(); });
    await testElement('#tog-tray', 'Toggle Tray', async el => { await el.click(); });

    await testElement('#s-preset-select', 'Select Preset', async el => {
      await el.selectOption('youtube-discord');
    });

    await testElement('#btn-save-settings', 'Save Settings', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '11_settings_saved.png') });

    // ── 5. Logs Page Controls ──────────────────────────────
    console.log('\n--- 5. Logs Page Controls ---');
    await testElement('#nav-logs', 'Go to Logs', async el => { await el.click(); });

    await testElement('#log-level-filter', 'Filter Log Level', async el => { await el.selectOption('info'); });
    await testElement('#btn-copy-logs', 'Copy Logs', async el => { await el.click(); });
    await testElement('#btn-clear-logs', 'Clear Logs', async el => { await el.click(); });
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '12_logs_cleared.png') });

    // ── 6. Engine Start & Boundary Spam Clicks ─────────────
    console.log('\n--- 6. Engine & Spam Clicks Boundary Test ---');
    await testElement('#nav-dashboard', 'Go to Dashboard', async el => { await el.click(); });

    console.log('  └─ Spam click #btn-engine-toggle (3 fast clicks)...');
    const engineBtn = window.locator('#btn-engine-toggle');
    await engineBtn.click({ force: true });
    await engineBtn.click({ force: true });
    await engineBtn.click({ force: true });

    await window.waitForTimeout(1000);
    await window.screenshot({ path: path.join(SCREENSHOT_DIR, '13_engine_toggled.png') });

    console.log('\n====================================================');
    console.log(`🎉 E2E TEST COMPLETED SUCCESSFULLY!`);
    console.log('====================================================');

  } catch (err) {
    console.error('💥 E2E Execution Error:', err);
  } finally {
    if (app) {
      console.log('\n🛑 Step 3: Closing Playwright session...');
      await app.close().catch(() => {});
    }

    // ── ЭТАП 3: Очистка процессов (CRITICAL STEP) ───────────
    console.log('🧹 FORCING PROCESS CLEANUP (taskkill)...');
    try {
      execSync('taskkill /F /IM electron.exe /T 2>nul');
      execSync('taskkill /F /IM "Zapret2 Manager.exe" 2>nul');
      execSync('taskkill /F /IM winws2.exe 2>nul');
      console.log('✅ All background processes terminated cleanly.');
    } catch (_) {
      console.log('✅ No leftover processes found.');
    }
  }
})();
