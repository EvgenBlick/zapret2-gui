/**
 * Zapret2 Manager — Renderer App Logic  v1.1
 */
(() => {
'use strict';

// ─── Diagnostics ──────────────────────────────────────────
console.log('%c⚡ Zapret2 Manager v1.1', 'color:#7c3aed;font-weight:800;font-size:15px');
console.log('%cRenderer process started', 'color:#484f58;font-size:11px');

window.addEventListener('error', e => {
  console.error('[Renderer Error]', e.message, e.filename, e.lineno);
  if (typeof showToast === 'function') showToast(e.message || 'Ошибка выполнения', 'error');
});
window.addEventListener('unhandledrejection', e => {
  console.error('[Unhandled Promise]', e.reason);
  const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  if (typeof showToast === 'function') showToast(msg || 'Ошибка IPC / Запроса', 'error');
});

// ─── Global API ───────────────────────────────────────────
const api = window.api;
if (!api) {
  document.body.innerHTML = '<div style="color:red;padding:40px;font-family:monospace">FATAL: window.api not found. preload.js not loaded correctly.</div>';
  throw new Error('window.api is undefined');
}

// ─── State ────────────────────────────────────────────────
const S = {
  running:       false,
  startedAt:     null,
  apps:          [],
  sites:         [],
  profiles:      {},
  activeProfile: 'default',
  logs:          [],
  logFilter:     'all',
  selectedPath:  null,
  selectedApp:   null,   // running app selected
  editProfileId: null,
  runningApps:   [],
  _uptimeTimer:  null
};

// ─── DOM refs ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ══════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await bootstrap();
    } catch (err) {
      console.error('[Bootstrap Error]', err);
      showToast('Ошибка инициализации: ' + err.message, 'error');
    }
  });
} else {
  bootstrap().catch(err => {
    console.error('[Bootstrap Error]', err);
    showToast('Ошибка инициализации: ' + err.message, 'error');
  });
}

async function bootstrap() {
  console.log('[Bootstrap] Wiring UI listeners first...');
  // 1. Wire ALL event listeners synchronously BEFORE any async calls
  wireWindow();
  wireNav();
  wireEngineToggle();
  wireDashboard();
  wireAppsPage();
  wireSitesPage();
  wireProfilesPage();
  wireLogsPage();
  wireSettingsPage();
  wireModals();
  wireKeyboard();
  subscribeEvents();

  // 2. Load store & sync state with safe try-catch wrappers
  try {
    await loadStore();
    updateCounts();
  } catch (err) {
    console.error('[Bootstrap Store Error]', err);
    showToast('Ошибка загрузки конфигурации: ' + err.message, 'error');
  }

  try {
    const status = await api.engine.status();
    S.running   = status.running;
    S.startedAt = status.startedAt;
    updateStatusUI(S.running);
  } catch (err) {
    console.error('[Bootstrap Status Error]', err);
  }

  try {
    const isAdmin = await api.system.isAdmin();
    if (!isAdmin) $('admin-banner')?.classList.remove('hidden');
  } catch (_) {}

  try {
    const logs = await api.engine.logs();
    logs.forEach(e => appendLog(e, false));
    if ($('log-count')) $('log-count').textContent = `${S.logs.length} записей`;
  } catch (_) {}

  console.log(`[Bootstrap] OK — apps:${S.apps.length} sites:${S.sites.length} running:${S.running}`);
}

// ─── Load Store ───────────────────────────────────────────
async function loadStore() {
  const store      = await api.store.getAll();
  S.apps           = store.bypassApps   || [];
  S.sites          = store.bypassSites  || [];
  S.profiles       = store.profiles     || { default: { name: 'Default', args: '--wf-tcp-out=80,443 --wf-udp-out=443', luaInit: '@zapret-antidpi.lua' } };
  S.activeProfile  = store.activeProfile || 'default';
}

async function saveStore() {
  await api.store.set('bypassApps',    S.apps);
  await api.store.set('bypassSites',   S.sites);
  await api.store.set('profiles',      S.profiles);
  await api.store.set('activeProfile', S.activeProfile);
}

// ══════════════════════════════════════════════════════════
// WINDOW CONTROLS
// ══════════════════════════════════════════════════════════
function wireWindow() {
  $('btn-minimize')?.addEventListener('click', () => api.win.minimize());
  $('btn-maximize')?.addEventListener('click', () => api.win.maximize());
  $('btn-close')?.addEventListener('click',   () => api.win.close());
  $('admin-dismiss')?.addEventListener('click', () => $('admin-banner')?.classList.add('hidden'));
}

// ══════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════
function wireNav() {
  $$('[data-page]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });
}

function navigateTo(pageId) {
  $$('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageId);
    b.setAttribute('aria-current', b.dataset.page === pageId ? 'page' : 'false');
  });
  $$('.page').forEach(p => p.classList.remove('active'));
  const page = $(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Page-specific init on first visit
  if (pageId === 'apps')     renderApps();
  if (pageId === 'sites')    renderSites();
  if (pageId === 'profiles') renderProfiles();
  if (pageId === 'settings') populateSettings();
  if (pageId === 'logs')     $('badge-logs')?.classList.add('hidden');
}

// ══════════════════════════════════════════════════════════
// ENGINE TOGGLE (sidebar)
// ══════════════════════════════════════════════════════════
function wireEngineToggle() {
  const toggle = $('engine-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', toggleEngine);
  toggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEngine(); } });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════
function wireDashboard() {
  $('btn-engine-toggle')?.addEventListener('click', toggleEngine);
  $('btn-restart')?.addEventListener('click', restartEngine);
  $('btn-auto-scan')?.addEventListener('click', openScanModal);
  $('btn-start-scan')?.addEventListener('click', runAutoScanner);
}

function openScanModal() {
  $('scan-status-box')?.classList.add('hidden');
  showModal('modal-scan');
}

async function runAutoScanner() {
  const url = $('scan-url-input')?.value?.trim() || 'https://www.youtube.com';
  const box = $('scan-status-box');
  const txt = $('scan-status-text');
  const bar = $('scan-progress-bar');
  const btn = $('btn-start-scan');

  if (box) box.classList.remove('hidden');
  if (btn) btn.disabled = true;
  if (bar) bar.style.width = '0%';
  if (txt) txt.textContent = 'Инициализация перебора...';

  const unsub = api.on.scanProgress(({ index, total, name }) => {
    const pct = Math.round((index / total) * 100);
    if (bar) bar.style.width = `${pct}%`;
    if (txt) txt.textContent = `[${index}/${total}] Проверка: ${name}...`;
  });

  try {
    const res = await api.system.scanStrategies(url);
    if (res.ok) {
      showToast(`🎉 Найдена рабочая стратегия: ${res.workingStrategy}!`, 'success', 6000);
      closeModal('modal-scan');
      await loadStore();
      renderProfiles();
    } else {
      showToast(res.err || 'Не удалось найти пробивающую стратегию', 'error', 5000);
    }
  } catch (err) {
    showToast('Ошибка сканера: ' + err.message, 'error');
  } finally {
    unsub();
    if (btn) btn.disabled = false;
  }
}

async function toggleEngine() {
  if (S._engineBusy) return;
  S._engineBusy = true;
  setEngineLoading(true);
  try {
    if (S.running) {
      const r = await api.engine.stop();
      if (!r.ok) showToast(r.err || 'Ошибка остановки', 'error');
    } else {
      const r = await api.engine.start();
      if (!r.ok) showToast(r.err || 'Ошибка запуска', 'error');
    }
  } catch (e) {
    showToast('Ошибка: ' + e.message, 'error');
  } finally {
    setEngineLoading(false);
    S._engineBusy = false;
  }
}

async function restartEngine() {
  if (!S.running || S._engineBusy) return;
  S._engineBusy = true;
  const btn = $('btn-restart');
  if (btn) btn.disabled = true;
  try {
    await api.engine.stop();
    await delay(700);
    const r = await api.engine.start();
    if (!r.ok) showToast(r.err || 'Ошибка перезапуска', 'error');
  } catch (e) {
    showToast('Ошибка рестарта: ' + e.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
    S._engineBusy = false;
  }
}

let _engineLoading = false;
function setEngineLoading(v) {
  _engineLoading = v;
  const btn = $('btn-engine-toggle');
  if (btn) btn.disabled = v;
}

function updateStatusUI(running) {
  S.running = running;

  // Titlebar
  const tbStatus  = $('tb-status');
  const tbDot     = $('tb-dot');
  const tbText    = $('tb-status-text');
  if (tbStatus) tbStatus.classList.toggle('running', running);
  if (tbDot)    tbDot.style.background = running ? 'var(--c-green)' : 'var(--c-red)';
  if (tbText)   tbText.textContent = running ? 'Работает' : 'Остановлен';

  // Hero card
  const heroCard  = $('hero-card');
  const heroRing  = $('hero-ring-fill');
  const heroCenter= $('hero-ring-center');
  const heroTitle = $('hero-title');
  const heroSub   = $('hero-sub');
  const heroUptime= $('hero-uptime-row');
  const btnText   = $('btn-engine-text');
  const btnIcon   = $('btn-engine-icon');
  const btnToggle = $('btn-engine-toggle');
  const btnRestart= $('btn-restart');

  if (heroCard)   heroCard.classList.toggle('running', running);
  if (heroRing)   { heroRing.classList.toggle('active', running); heroRing.classList.remove('starting'); }
  if (heroCenter) heroCenter.classList.toggle('running', running);

  if (running) {
    if (heroTitle) heroTitle.textContent  = 'Защита активна';
    if (heroSub)   heroSub.textContent    = 'Запret2 обрабатывает трафик';
    if (heroUptime)heroUptime.classList.remove('hidden');
    if (btnText)   btnText.textContent    = 'Остановить';
    if (btnToggle) { btnToggle.style.background = 'var(--c-red)'; btnToggle.style.boxShadow = '0 4px 16px rgba(248,81,73,.35)'; }
    if (btnIcon)   btnIcon.innerHTML = `<rect x="6" y="6" width="12" height="12" rx="1"/>`;
    if (btnRestart)btnRestart.disabled = false;
    startUptimeTick();
  } else {
    if (heroTitle) heroTitle.textContent  = 'Защита отключена';
    if (heroSub)   heroSub.textContent    = 'Нажмите кнопку или пробел для старта';
    if (heroUptime)heroUptime.classList.add('hidden');
    if (btnText)   btnText.textContent    = 'Запустить';
    if (btnToggle) { btnToggle.style.background = ''; btnToggle.style.boxShadow = ''; }
    if (btnIcon)   btnIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
    if (btnRestart)btnRestart.disabled = true;
    stopUptimeTick();
    $('stat-uptime-val').textContent = '—';
  }

  // Sidebar engine toggle
  const engTog  = $('engine-toggle');
  const engProg = $('engine-ring-prog');
  const engText = $('engine-state-text');
  if (engTog)  engTog.classList.toggle('running', running);
  if (engTog)  engTog.setAttribute('aria-pressed', running.toString());
  if (engProg) { engProg.classList.toggle('active', running); engProg.classList.remove('starting'); }
  if (engText) engText.textContent = running ? 'Работает' : 'Выключен';
}

function startUptimeTick() {
  stopUptimeTick();
  S._uptimeTimer = setInterval(() => {
    if (!S.startedAt) return;
    const sec = Math.floor((Date.now() - S.startedAt) / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const str = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    const el = $('hero-uptime');
    const su = $('stat-uptime-val');
    if (el) el.textContent = str;
    if (su) su.textContent = str;
  }, 1000);
}
function stopUptimeTick() {
  if (S._uptimeTimer) { clearInterval(S._uptimeTimer); S._uptimeTimer = null; }
}
function pad(n) { return String(n).padStart(2, '0'); }

function updateCounts() {
  const ac = S.apps.length;
  const sc = S.sites.length;
  $('stat-apps-val').textContent   = ac;
  $('stat-sites-val').textContent  = sc;
  $('badge-apps').textContent      = ac;
  $('badge-sites').textContent     = sc;
  $('stat-profile-val').textContent= S.activeProfile;
}

// ══════════════════════════════════════════════════════════
// APPS PAGE
// ══════════════════════════════════════════════════════════
function wireAppsPage() {
  $('btn-add-app')?.addEventListener('click',       openAppsModal);
  $('btn-add-app-empty')?.addEventListener('click', openAppsModal);
  $('apps-search')?.addEventListener('input',       renderApps);
  $('btn-browse-exe')?.addEventListener('click',    browseExeDialog);
  $('btn-clear-file')?.addEventListener('click',    clearFileSelection);
  $('btn-confirm-add-app')?.addEventListener('click', confirmAddApp);
  $('running-search')?.addEventListener('input',    filterRunning);

  // Dropzone drag events
  const dz = $('dropzone');
  if (dz) {
    dz.addEventListener('click', browseExeDialog);
    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.name.endsWith('.exe')) setFileSelection(file.path, file.name);
    });
  }

  // Tab switching
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab, btn));
  });
}

function renderApps() {
  const query  = ($('apps-search')?.value || '').toLowerCase();
  const list   = $('apps-list');
  const empty  = $('apps-empty');
  const items  = S.apps.filter(a => (a.name + a.path).toLowerCase().includes(query));

  list.querySelectorAll('.item-row').forEach(el => el.remove());

  if (items.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  items.forEach(app => list.appendChild(createAppRow(app)));
}

function createAppRow(app) {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.setAttribute('role', 'listitem');
  row.dataset.id = app.id;
  row.innerHTML = `
    <div class="item-row__emoji" aria-hidden="true">${appEmoji(app.name)}</div>
    <div class="item-row__info">
      <div class="item-row__name">${esc(app.name || baseName(app.path))}</div>
      <div class="item-row__sub">${esc(app.path || '')}</div>
    </div>
    <div class="item-row__actions">
      <div class="toggle ${app.enabled !== false ? 'toggle--on' : ''}"
           role="switch" aria-checked="${app.enabled !== false}" 
           aria-label="Включить ${esc(app.name)}" data-toggle-id="${app.id}" tabindex="0"></div>
      <button class="btn btn--ghost btn--sm btn--icon-only btn--danger"
              data-del-app="${app.id}" aria-label="Удалить ${esc(app.name)}" title="Удалить">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;

  row.querySelector(`[data-toggle-id="${app.id}"]`)?.addEventListener('click', async () => {
    const a = S.apps.find(x => x.id === app.id);
    if (a) { a.enabled = a.enabled === false; await saveStore(); renderApps(); }
  });
  row.querySelector(`[data-del-app="${app.id}"]`)?.addEventListener('click', async () => {
    S.apps = S.apps.filter(x => x.id !== app.id);
    await saveStore(); renderApps(); updateCounts();
    showToast(`Удалено: ${app.name}`, 'info');
  });
  return row;
}

function openAppsModal() {
  S.selectedPath = null;
  S.selectedApp  = null;
  clearFileSelection();
  $('app-name-input').value = '';
  $$('.tab')[0]?.click();
  showModal('modal-apps');
}

async function browseExeDialog() {
  const path = await api.dialog.exe();
  if (path) setFileSelection(path, baseName(path));
}

function setFileSelection(path, name) {
  S.selectedPath = path;
  $('dropzone').style.display   = 'none';
  $('file-preview').classList.remove('hidden');
  $('file-preview-name').textContent = name;
  $('file-preview-path').textContent = path;
}

function clearFileSelection() {
  S.selectedPath = null;
  $('dropzone').style.display  = '';
  $('file-preview').classList.add('hidden');
}

let _runningLoaded = false;
async function loadRunningApps() {
  if (_runningLoaded) return;
  _runningLoaded = true;
  const skeleton = $('running-skeleton');
  const list     = $('running-list');
  S.runningApps  = await api.system.runningApps();
  if (skeleton) skeleton.remove();
  renderRunningList(S.runningApps);
}

function renderRunningList(apps) {
  const list = $('running-list');
  list.querySelectorAll('.running-item').forEach(el => el.remove());
  apps.forEach(app => {
    const el = document.createElement('div');
    el.className = 'running-item';
    el.setAttribute('role', 'option');
    el.setAttribute('aria-selected', 'false');
    el.innerHTML = `<span class="running-item__name">${esc(app.name)}</span><span class="running-item__pid">PID ${app.pid}</span>`;
    el.addEventListener('click', () => {
      list.querySelectorAll('.running-item').forEach(i => {
        i.classList.remove('selected'); i.setAttribute('aria-selected','false');
      });
      el.classList.add('selected'); el.setAttribute('aria-selected','true');
      S.selectedApp = app;
    });
    list.appendChild(el);
  });
}

function filterRunning() {
  const q = ($('running-search')?.value || '').toLowerCase();
  renderRunningList(S.runningApps.filter(a => a.name.toLowerCase().includes(q)));
}

async function confirmAddApp() {
  const isRunningTab = $('tab-running')?.classList.contains('hidden') === false;
  let path = null, name = $('app-name-input')?.value?.trim();

  if (isRunningTab) {
    if (!S.selectedApp) { showToast('Выберите процесс из списка', 'error'); return; }
    path = S.selectedApp.name;
    name = name || S.selectedApp.name;
  } else {
    if (!S.selectedPath) { showToast('Выберите .exe файл', 'error'); return; }
    path = S.selectedPath;
    name = name || baseName(path);
  }

  if (S.apps.find(a => a.path === path)) { showToast('Уже добавлено', 'error'); return; }

  S.apps.push({ id: uid(), path, name, enabled: true, addedAt: new Date().toISOString() });
  await saveStore();
  closeModal('modal-apps');
  renderApps(); updateCounts();
  showToast(`Добавлено: ${name}`, 'success');
}

function switchTab(tabId, clickedBtn) {
  $$('.tab').forEach(b => { b.classList.toggle('tab--active', b.dataset.tab === tabId); b.setAttribute('aria-selected', b.dataset.tab === tabId); });
  $$('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== tabId));
  if (tabId === 'tab-running') loadRunningApps();
}

// ══════════════════════════════════════════════════════════
// SITES PAGE
// ══════════════════════════════════════════════════════════
function wireSitesPage() {
  $('btn-add-site')?.addEventListener('click',       openSitesModal);
  $('btn-add-site-empty')?.addEventListener('click', openSitesModal);
  $('sites-search')?.addEventListener('input',       renderSites);
  $('btn-confirm-add-site')?.addEventListener('click', confirmAddSites);
}

function renderSites() {
  const q     = ($('sites-search')?.value || '').toLowerCase();
  const list  = $('sites-list');
  const empty = $('sites-empty');
  const items = S.sites.filter(s => s.domain.toLowerCase().includes(q));

  list.querySelectorAll('.item-row').forEach(el => el.remove());
  if (items.length === 0) { empty.style.display = ''; return; }
  empty.style.display = 'none';

  items.forEach(site => {
    const isExclude = site.type === 'exclude';
    const badgeHtml = isExclude 
      ? `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.15);color:#ef4444;font-weight:700;margin-left:6px;">🚫 ИСКЛЮЧЕНИЕ</span>`
      : `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;margin-left:6px;">🌐 ОБХОД DPI</span>`;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <div class="item-row__emoji" aria-hidden="true">${isExclude ? '🚫' : '🌐'}</div>
      <div class="item-row__info">
        <div class="item-row__name">${esc(site.domain)} ${badgeHtml}</div>
        <div class="item-row__sub">Добавлен: ${fmtDate(site.addedAt)}</div>
      </div>
      <div class="item-row__actions">
        <div class="toggle ${site.enabled !== false ? 'toggle--on' : ''}"
             role="switch" aria-checked="${site.enabled !== false}"
             aria-label="Включить ${esc(site.domain)}" data-toggle-site="${site.id}" tabindex="0"></div>
        <button class="btn btn--ghost btn--sm btn--icon-only btn--danger"
                data-del-site="${site.id}" aria-label="Удалить ${esc(site.domain)}" title="Удалить">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>`;

    row.querySelector(`[data-toggle-site="${site.id}"]`)?.addEventListener('click', async () => {
      const s = S.sites.find(x => x.id === site.id);
      if (s) { s.enabled = s.enabled === false; await saveStore(); renderSites(); }
    });
    row.querySelector(`[data-del-site="${site.id}"]`)?.addEventListener('click', async () => {
      S.sites = S.sites.filter(x => x.id !== site.id);
      await saveStore(); renderSites(); updateCounts();
      showToast(`Удалено: ${site.domain}`, 'info');
    });
    list.appendChild(row);
  });
}

function openSitesModal() {
  $('sites-input').value = '';
  showModal('modal-sites');
}

async function confirmAddSites() {
  const raw = $('sites-input')?.value?.trim();
  if (!raw) { showToast('Введите хотя бы один домен', 'error'); return; }

  const siteType = $('site-type-select')?.value || 'include';
  const domains = [...new Set(raw.split('\n').map(d => d.trim()).filter(Boolean))];
  let added = 0;
  domains.forEach(domain => {
    if (!S.sites.find(s => s.domain === domain)) {
      S.sites.push({ id: uid(), domain, type: siteType, enabled: true, addedAt: new Date().toISOString() });
      added++;
    }
  });

  await saveStore();
  closeModal('modal-sites');
  renderSites(); updateCounts();
  showToast(`Добавлено ${added} доменов (${siteType === 'exclude' ? 'Исключение' : 'Обход'})`, 'success');
}

// ══════════════════════════════════════════════════════════
// PROFILES PAGE
// ══════════════════════════════════════════════════════════
function wireProfilesPage() {
  $('btn-add-profile')?.addEventListener('click', () => openProfileModal(null));
  $('btn-confirm-profile')?.addEventListener('click', confirmProfile);
}

function renderProfiles() {
  const grid = $('profiles-grid');
  grid.innerHTML = '';

  Object.entries(S.profiles).forEach(([id, p]) => {
    const isActive = id === S.activeProfile;
    const card = document.createElement('div');
    card.className = `profile-card ${isActive ? 'profile-card--active' : ''}`;
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      ${isActive ? '<div class="profile-card__badge">АКТИВНЫЙ</div>' : ''}
      <div class="profile-card__name">${esc(p.name || id)}</div>
      <div class="profile-card__args">${esc(p.args || '')}</div>
      ${p.luaInit ? `<div class="profile-card__lua">lua: ${esc(p.luaInit)}</div>` : ''}
      <div class="profile-card__actions">
        ${!isActive ? `<button class="btn btn--primary btn--sm" data-activate="${id}">Активировать</button>` : ''}
        <button class="btn btn--ghost btn--sm" data-edit-profile="${id}">Изменить</button>
        ${id !== 'default' ? `<button class="btn btn--ghost btn--sm btn--danger" data-del-profile="${id}">Удалить</button>` : ''}
      </div>`;

    card.querySelector(`[data-activate="${id}"]`)?.addEventListener('click', async () => {
      S.activeProfile = id;
      await saveStore(); renderProfiles(); updateCounts();
      showToast(`Профиль «${p.name}» активирован`, 'success');
    });
    card.querySelector(`[data-edit-profile="${id}"]`)?.addEventListener('click', () => openProfileModal(id));
    card.querySelector(`[data-del-profile="${id}"]`)?.addEventListener('click', async () => {
      delete S.profiles[id];
      if (S.activeProfile === id) S.activeProfile = 'default';
      await saveStore(); renderProfiles();
      showToast('Профиль удалён', 'info');
    });
    grid.appendChild(card);
  });
}

function openProfileModal(id) {
  S.editProfileId = id;
  $('modal-profile-title').textContent = id ? 'Редактировать профиль' : 'Новый профиль';
  const p = id ? S.profiles[id] : null;
  $('profile-edit-id').value = id || '';
  $('profile-name').value    = p?.name    || '';
  $('profile-args').value    = p?.args    || '--wf-tcp-out=80,443 --wf-udp-out=443';
  $('profile-lua').value     = p?.luaInit || '@zapret-antidpi.lua';
  showModal('modal-profile');
}

async function confirmProfile() {
  const id   = $('profile-edit-id').value || uid();
  const name = $('profile-name').value?.trim();
  const args = $('profile-args').value?.trim();
  const lua  = $('profile-lua').value?.trim();

  if (!name) { showToast('Введите название', 'error'); return; }

  S.profiles[id] = { name, args, luaInit: lua };
  await saveStore();
  closeModal('modal-profile');
  renderProfiles();
  showToast(`Профиль «${name}» сохранён`, 'success');
}

// ══════════════════════════════════════════════════════════
// LOGS PAGE
// ══════════════════════════════════════════════════════════
function wireLogsPage() {
  $('btn-clear-logs')?.addEventListener('click', () => {
    S.logs = [];
    $('log-pane').innerHTML = `
      <div class="empty-state" style="min-height:80px">
        <p class="empty-state__title" style="font-size:13px">Логи очищены</p>
      </div>`;
    $('log-count').textContent = '0 записей';
  });

  $('btn-copy-logs')?.addEventListener('click', () => {
    const text = S.logs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard?.writeText(text).then(() => showToast('Логи скопированы', 'info'));
  });

  $('log-level-filter')?.addEventListener('change', e => {
    S.logFilter = e.target.value;
    rerenderLogs();
  });
}

function appendLog(entry, live = true) {
  S.logs.push(entry);

  if (S.logFilter !== 'all' && entry.level !== S.logFilter) return;

  const pane  = $('log-pane');
  const empty = pane?.querySelector('.empty-state');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = `log-entry ${entry.level}`;
  el.innerHTML = `
    <span class="log-entry__time">${fmtTime(entry.time)}</span>
    <span class="log-entry__level">${entry.level}</span>
    <span class="log-entry__text">${esc(entry.text)}</span>`;
  pane?.appendChild(el);

  if ($('log-autoscroll')?.checked) pane.scrollTop = pane.scrollHeight;

  $('log-count').textContent = `${S.logs.length} записей`;

  if (live && !$('page-logs')?.classList.contains('active')) {
    $('badge-logs')?.classList.remove('hidden');
  }
}

function rerenderLogs() {
  const pane = $('log-pane');
  pane.innerHTML = '';
  const filtered = S.logFilter === 'all' ? S.logs : S.logs.filter(l => l.level === S.logFilter);
  if (filtered.length === 0) {
    pane.innerHTML = '<div class="empty-state" style="min-height:80px"><p class="empty-state__title" style="font-size:13px">Нет записей</p></div>';
  } else {
    filtered.forEach(e => {
      const el = document.createElement('div');
      el.className = `log-entry ${e.level}`;
      el.innerHTML = `<span class="log-entry__time">${fmtTime(e.time)}</span><span class="log-entry__level">${e.level}</span><span class="log-entry__text">${esc(e.text)}</span>`;
      pane.appendChild(el);
    });
  }
}

// ══════════════════════════════════════════════════════════
// SETTINGS PAGE
// ══════════════════════════════════════════════════════════


const PRESETS = {
  'youtube-discord': {
    args: '--wf-tcp-out=80,443 --wf-udp-out=443,50000-65535 --filter-tcp=80 --filter-l7=http --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:ip_autottl=-2,3-20:ip6_autottl=-2,3-20:tcp_md5 --lua-desync=fakedsplit:ip_autottl=-2,3-20:ip6_autottl=-2,3-20:tcp_md5 --new --filter-tcp=443 --filter-l7=tls --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_md5:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=443 --filter-l7=tls --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_md5:tcp_seq=-10000:repeats=6 --lua-desync=multidisorder:pos=midsld --new --filter-udp=443 --filter-l7=quic --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11',
    lua: 'zapret-antidpi.lua'
  },
  'standard': {
    args: '--wf-tcp-out=80,443 --wf-udp-out=443 --filter-tcp=443 --filter-l7=tls --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6 --lua-desync=multidisorder:pos=1,midsld',
    lua: 'zapret-antidpi.lua'
  },
  'auto': {
    args: '--wf-tcp-out=80,443 --wf-udp-out=443',
    lua: 'zapret-auto.lua'
  },
  'aggressive': {
    args: '--wf-tcp-out=80,443 --wf-udp-out=443,50000-65535 --filter-tcp=80,443 --filter-l7=tls,http --out-range=-d10 --payload=tls_client_hello,http_req --lua-desync=fake:blob=fake_default_tls:ip_autottl=-2,3-20:tcp_md5:repeats=10 --lua-desync=multidisorder:pos=1,midsld',
    lua: 'zapret-antidpi.lua'
  }
};

function wireSettingsPage() {
  $('tog-autostart')?.addEventListener('click', toggleSwitch);
  $('tog-tray')?.addEventListener('click',      toggleSwitch);

  $('s-preset-select')?.addEventListener('change', (e) => {
    const p = PRESETS[e.target.value];
    if (p) {
      if ($('s-wf-args')) $('s-wf-args').value = p.args;
      if ($('s-lua-init')) $('s-lua-init').value = p.lua;
    }
  });

  $('btn-save-settings')?.addEventListener('click', saveSettings);
  $('btn-open-github')?.addEventListener('click',   () => api.system.openExternal('https://github.com/bol-van/zapret2'));
  $('btn-open-releases')?.addEventListener('click', () => api.system.openExternal('https://github.com/bol-van/zapret2/releases'));
  $('btn-gh')?.addEventListener('click',            () => api.system.openExternal('https://github.com/bol-van/zapret2'));
}

function toggleSwitch(e) {
  const tog = e.currentTarget;
  const isOn = tog.classList.toggle('toggle--on');
  tog.setAttribute('aria-checked', isOn.toString());
}

async function populateSettings() {
  const store = await api.store.getAll();

  const togAuto = $('tog-autostart');
  const togTray = $('tog-tray');
  if (store.autoStart)            togAuto.classList.add('toggle--on');
  else                            togAuto.classList.remove('toggle--on');
  if (store.minimizeToTray !== false) togTray.classList.add('toggle--on');
  else                            togTray.classList.remove('toggle--on');

  const dp = store.profiles?.default || {};
  if ($('s-wf-args'))  $('s-wf-args').value = dp.args    || '--wf-tcp-out=80,443 --wf-udp-out=443';
  if ($('s-lua-init')) $('s-lua-init').value = (dp.luaInit || 'zapret-antidpi.lua').replace(/^@/, '');
  if ($('s-extra'))    $('s-extra').value   = '';
}

async function saveSettings() {
  const autoStart  = $('tog-autostart')?.classList.contains('toggle--on');
  const miniTray   = $('tog-tray')?.classList.contains('toggle--on');
  const wfArgs     = $('s-wf-args')?.value?.trim();
  const luaInit    = $('s-lua-init')?.value?.trim();
  const extra      = $('s-extra')?.value?.trim();

  await api.store.set('autoStart',      autoStart);
  await api.store.set('minimizeToTray', miniTray);

  S.profiles.default = {
    ...S.profiles.default,
    name: 'Default',
    args: [wfArgs, extra].filter(Boolean).join(' '),
    luaInit: luaInit || 'zapret-antidpi.lua'
  };
  await saveStore();
  showToast('Настройки сохранены', 'success');
}

// ══════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════
function wireModals() {
  // Close buttons
  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  // Backdrop click
  $$('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function showModal(id) {
  const el = $(id);
  if (!el) return;
  el.removeAttribute('hidden');
  // Focus first focusable
  requestAnimationFrame(() => el.querySelector('input,textarea,button')?.focus());
}

function closeModal(id) {
  const el = $(id);
  if (el) el.setAttribute('hidden', '');
}

// ══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════
function wireKeyboard() {
  document.addEventListener('keydown', async e => {
    const inField = e.target.matches('input,textarea,select');

    // Escape — close modals
    if (e.key === 'Escape') {
      $$('.modal-overlay:not([hidden])').forEach(m => m.setAttribute('hidden', ''));
      return;
    }

    if (e.ctrlKey && e.key === 's' && !inField) {
      e.preventDefault();
      if ($('page-settings')?.classList.contains('active')) await saveSettings();
      return;
    }

    // Space — toggle engine (only on dashboard)
    if (e.key === ' ' && !inField && $('page-dashboard')?.classList.contains('active')) {
      e.preventDefault();
      toggleEngine();
    }
  });
}

// ══════════════════════════════════════════════════════════
// IPC EVENTS FROM MAIN
// ══════════════════════════════════════════════════════════
function subscribeEvents() {
  api.on.statusChange(({ running, startedAt }) => {
    S.startedAt = startedAt;
    updateStatusUI(running);
  });
  api.on.logEntry(entry => appendLog(entry, true));
}

// ══════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════
const ICONS = {
  success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
};

function showToast(msg, type = 'info', duration = 3500) {
  const container = $('toast-container');
  if (!container) return;
  while (container.children.length >= 4) {
    container.firstElementChild.remove();
  }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `<span class="toast__icon">${ICONS[type] || ICONS.info}</span><span class="toast__text">${esc(msg)}</span><button class="toast__close" style="background:none;border:none;color:inherit;cursor:pointer;opacity:0.6;margin-left:8px;font-size:14px;" aria-label="Закрыть">&times;</button>`;
  toast.querySelector('.toast__close')?.addEventListener('click', () => toast.remove());
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════
function esc(str = '') {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function baseName(p = '') {
  return p.replace(/\\/g,'/').split('/').pop() || p;
}

function appEmoji(name = '') {
  const n = name.toLowerCase();
  if (n.includes('chrome') || n.includes('chromium')) return '🌐';
  if (n.includes('firefox'))   return '🦊';
  if (n.includes('telegram'))  return '✈️';
  if (n.includes('steam'))     return '🎮';
  if (n.includes('discord'))   return '💬';
  if (n.includes('vlc'))       return '🎬';
  if (n.includes('spotify'))   return '🎵';
  if (n.includes('git'))       return '🐙';
  if (n.includes('code'))      return '💻';
  if (n.includes('torrent'))   return '⚡';
  if (n.includes('zoom') || n.includes('teams')) return '📹';
  return '📦';
}

function fmtTime(iso) {
  return iso ? new Date(iso).toTimeString().slice(0,8) : '';
}
function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('ru-RU') : '';
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// End of app.js
})();
