/**
 * Zapret2 Manager — Main Process  v1.1
 * Electron entry point: BrowserWindow, IPC, Tray, Process management
 */

'use strict';

const {
  app, BrowserWindow, ipcMain, dialog, shell,
  Tray, Menu, nativeImage, powerMonitor, session
} = require('electron');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn, exec } = require('child_process');

// ─── Constants ────────────────────────────────────────────
const IS_DEV     = process.argv.includes('--dev') || !app.isPackaged;
const IS_WIN     = process.platform === 'win32';
const APP_DIR    = app.getPath('userData');
const BIN_DIR    = app.isPackaged
  ? path.join(process.resourcesPath, 'bin')
  : path.join(__dirname, '..', 'bin');

// ─── Store (Zero-dependency JSON Store) ────────────────────
const CONFIG_FILE = path.join(APP_DIR, 'config.json');

const DEFAULT_CONFIG = {
  zapretPath:      BIN_DIR,
  autoStart:       false,
  minimizeToTray:  true,
  windowBounds:    { width: 1220, height: 800 },
  bypassApps:      [],
  bypassSites:     [
    { id: 's1', domain: 'youtube.com', enabled: true },
    { id: 's2', domain: 'googlevideo.com', enabled: true },
    { id: 's3', domain: 'discord.com', enabled: true },
    { id: 's4', domain: 'discord.gg', enabled: true },
    { id: 's5', domain: 'discord.media', enabled: true }
  ],
  activeProfile:   'alt11',
  profiles: {
    "general_alt_": {
        "name": "⭐ general (ALT)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#10b981"
    },
    "general_alt10_": {
        "name": "⭐ general (ALT10)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#3b82f6"
    },
    "general_alt11_": {
        "name": "⭐ general (ALT11)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#8b5cf6"
    },
    "general_alt12_": {
        "name": "⭐ general (ALT12)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=3 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#ec4899"
    },
    "general_alt2_": {
        "name": "⭐ general (ALT2)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#f59e0b"
    },
    "general_alt3_": {
        "name": "⭐ general (ALT3)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#06b6d4"
    },
    "general_alt4_": {
        "name": "⭐ general (ALT4)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#ef4444"
    },
    "general_alt5_": {
        "name": "⭐ general (ALT5)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=80,443,2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=14",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#14b8a6"
    },
    "general_alt6_": {
        "name": "⭐ general (ALT6)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#6366f1"
    },
    "general_alt7_": {
        "name": "⭐ general (ALT7)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2,sniext+1:seqovl=679 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2,sniext+1:seqovl=679 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2,sniext+1:seqovl=679 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#a855f7"
    },
    "general_alt8_": {
        "name": "⭐ general (ALT8)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#d97706"
    },
    "general_alt9_": {
        "name": "⭐ general (ALT9)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#0284c7"
    },
    "general_exp_": {
        "name": "⭐ general (EXP)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-tcp=443 --filter-l7=quic --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun,unknown --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=4:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=4:seqovl=480:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=480 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=4:seqovl=480:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=480 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=5",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#10b981"
    },
    "general_fake_tls_auto_alt_": {
        "name": "⭐ general (FAKE TLS AUTO ALT)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#3b82f6"
    },
    "general_fake_tls_auto_alt2_": {
        "name": "⭐ general (FAKE TLS AUTO ALT2)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#8b5cf6"
    },
    "general_fake_tls_auto_alt3_": {
        "name": "⭐ general (FAKE TLS AUTO ALT3)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#ec4899"
    },
    "general_fake_tls_auto_": {
        "name": "⭐ general (FAKE TLS AUTO)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#f59e0b"
    },
    "general_simple_fake_alt_": {
        "name": "⭐ general (SIMPLE FAKE ALT)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#06b6d4"
    },
    "general_simple_fake_alt2_": {
        "name": "⭐ general (SIMPLE FAKE ALT2)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#ef4444"
    },
    "general_simple_fake_": {
        "name": "⭐ general (SIMPLE FAKE)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#14b8a6"
    },
    "general": {
        "name": "⭐ general",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=568 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=568 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=568 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12",
        "luaInit": "@zapret-antidpi.lua",
        "color": "#6366f1"
    }
}
};

let _configCache = null;

function loadConfig() {
  if (_configCache) return _configCache;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      _configCache = {
        ...DEFAULT_CONFIG,
        ...data,
        profiles: { ...DEFAULT_CONFIG.profiles, ...(data.profiles || {}) }
      };
      return _configCache;
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  _configCache = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return _configCache;
}

function saveConfig() {
  try {
    fs.mkdirSync(APP_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(_configCache, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing config:', e);
  }
}

const storeApi = {
  get: (key, def) => {
    const cfg = loadConfig();
    if (!key) return cfg;
    // Support dot notation like profiles.default
    const parts = key.split('.');
    let val = cfg;
    for (const p of parts) {
      if (val == null) return def;
      val = val[p];
    }
    return val ?? def;
  },
  set: (key, val) => {
    const cfg = loadConfig();
    const parts = key.split('.');
    let curr = cfg;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!curr[parts[i]]) curr[parts[i]] = {};
      curr = curr[parts[i]];
    }
    curr[parts[parts.length - 1]] = val;
    saveConfig();
  },
  delete: (key) => {
    const cfg = loadConfig();
    delete cfg[key];
    saveConfig();
  },
  get store() { return loadConfig(); }
};

async function getStore() {
  return storeApi;
}

// ─── State ────────────────────────────────────────────────
let mainWindow   = null;
let tray         = null;
let winwsProcess = null;
let isRunning    = false;
let startedAt    = null;
const logBuffer  = [];
const MAX_LOGS   = 1000;

// ─── Window ───────────────────────────────────────────────
async function createWindow() {
  const store  = await getStore();
  const bounds = store.get('windowBounds', { width: 1220, height: 800 });

  mainWindow = new BrowserWindow({
    width:           Math.max(bounds.width  || 1220, 900),
    height:          Math.max(bounds.height || 800,  600),
    minWidth:        860,
    minHeight:       560,
    frame:           true,            // Native Windows window frame
    autoHideMenuBar: true,
    backgroundColor: '#0a0d12',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
      devTools:         true          // Always allow devTools for debugging
    },
    icon: path.join(__dirname, '..', 'assets', 'icon.png')
  });

  const IS_TEST = process.env.NODE_ENV === 'test';
  if (IS_DEV && !IS_TEST) mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Forward renderer console messages to main process stdout (diagnostics)
  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    const lvl = ['verbose','info','warn','error'][level] ?? 'log';
    if (lvl === 'warn' || lvl === 'error') {
      console[lvl](`[Renderer ${lvl.toUpperCase()}] ${message}  (${sourceId}:${line})`);
    }
  });

  // Persist window bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    store.set('windowBounds', mainWindow.getBounds());
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move',   saveBounds);

  // Minimize to tray on close
  mainWindow.on('close', async (e) => {
    const s = await getStore();
    if (s.get('minimizeToTray') && tray && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      tray.displayBalloon?.({
        title:   'Zapret2 Manager',
        content: 'Приложение свёрнуто в трей',
        icon:    nativeImage.createEmpty()
      });
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Tray ─────────────────────────────────────────────────
function createTray() {
  try {
    let iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
    if (!fs.existsSync(iconPath)) {
      iconPath = path.join(process.resourcesPath, 'assets', 'tray.png');
    }
    let icon = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
      : null;

    if (!icon || icon.isEmpty()) {
      const b64 = 'iVBORw0KGgoAAAANSU56UhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAzSURBVDhPY2AYBaNgOIApUa3/oYn9x6aGgTGBiXkMTAyM2E0jWz8D44NhFAx3AAA6JwcRFx9EcwAAAABJRU5ErkJggg==';
      icon = nativeImage.createFromBuffer(Buffer.from(b64, 'base64'));
    }

    tray = new Tray(icon);
    tray.setToolTip('Zapret2 Manager');
    refreshTrayMenu();
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (err) {
    console.error('[Tray Error] Could not create system tray:', err);
  }
}

function refreshTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: isRunning ? '● Работает' : '○ Остановлен', enabled: false,
      icon: nativeImage.createEmpty() },
    { type: 'separator' },
    {
      label: isRunning ? 'Остановить' : 'Запустить',
      click: () => isRunning ? stopEngine() : startEngine()
    },
    { label: 'Перезапустить', enabled: isRunning,
      click: async () => { await stopEngine(); setTimeout(startEngine, 700); }
    },
    { type: 'separator' },
    { label: 'Открыть окно', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Выйти', click: () => { app.isQuitting = true; stopEngine(); app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

// ─── Engine (winws2) ──────────────────────────────────────
async function startEngine(customArgs = null) {
  if (isRunning) return { ok: false, err: 'Already running' };

  const store      = await getStore();
  const zapretPath = store.get('zapretPath') || BIN_DIR;
  const winwsExe   = path.join(zapretPath, 'winws2.exe');

  if (!fs.existsSync(winwsExe)) {
    const msg = `winws2.exe не найден.\nПуть: ${winwsExe}\n\nУкажите корректный путь в Настройках.`;
    return { ok: false, err: msg };
  }

  const profileId = store.get('activeProfile', 'default');
  const profile   = store.get(`profiles.${profileId}`, store.get('profiles.default'));
  const wfArgs    = (customArgs || profile.args || '--wf-tcp-out=80,443 --wf-udp-out=443')
    .trim().split(/\s+/).filter(Boolean);

  // Build hostlist and hostlist-exclude from sites
  const allSites     = store.get('bypassSites') || [];
  const includeSites = allSites.filter(s => s.enabled !== false && s.type !== 'exclude');
  const excludeSites = allSites.filter(s => s.enabled !== false && s.type === 'exclude');

  const extraArgs = [];
  if (includeSites.length > 0) {
    const hostFile = path.join(os.tmpdir(), 'z2_hostlist.txt').replace(/\\/g, '/');
    const domainList = includeSites.map(s => s.domain.replace(/^\*\./, '')).filter(Boolean);
    fs.writeFileSync(hostFile, domainList.join('\n'), 'utf8');
    extraArgs.push(`--hostlist=${hostFile}`);
    log('info', `Hostlist (Обход DPI): ${domainList.length} доменов → ${hostFile}`);
  }

  if (excludeSites.length > 0) {
    const excludeFile = path.join(os.tmpdir(), 'z2_exclude_hostlist.txt').replace(/\\/g, '/');
    const excludeDomainList = excludeSites.map(s => s.domain.replace(/^\*\./, '')).filter(Boolean);
    fs.writeFileSync(excludeFile, excludeDomainList.join('\n'), 'utf8');
    extraArgs.push(`--hostlist-exclude=${excludeFile}`);
    log('info', `Hostlist Exclude (Исключения напрямую): ${excludeDomainList.length} доменов → ${excludeFile}`);
  }

  const libLuaPath  = path.join(zapretPath, 'lua', 'zapret-lib.lua').replace(/\\/g, '/');
  const antiLuaPath = path.join(zapretPath, 'lua', 'zapret-antidpi.lua').replace(/\\/g, '/');

  const luaInitArgs = [];
  if (fs.existsSync(libLuaPath)) {
    luaInitArgs.push(`--lua-init=@${libLuaPath}`);
  }
  if (fs.existsSync(antiLuaPath)) {
    luaInitArgs.push(`--lua-init=@${antiLuaPath}`);
  }

  const hasLuaInit = wfArgs.some(a => a.startsWith('--lua-init'));
  const cmdArgs = hasLuaInit ? [...wfArgs, ...extraArgs] : [...luaInitArgs, ...wfArgs, ...extraArgs];

  log('info', `▶ Запуск: ${winwsExe}`);
  log('info', `  Аргументы: ${cmdArgs.join(' ')}`);

  const isAdmin = await new Promise(r => exec('net session', err => r(!err)));
  if (!isAdmin) {
    log('error', '⚠️ ВНИМАНИЕ: Для работы WinDivert требуются права Администратора! Запустите приложение от имени администратора.');
  }

  try {
    winwsProcess = spawn(winwsExe, cmdArgs, { cwd: zapretPath, windowsHide: true });

    winwsProcess.stdout.on('data', d => log('stdout', d.toString().trim()));
    winwsProcess.stderr.on('data', d => log('stderr', d.toString().trim()));
    winwsProcess.on('error', err => {
      log('error', `Ошибка процесса: ${err.message}`);
      setRunning(false);
    });
    winwsProcess.on('exit', (code, signal) => {
      log('info', `■ Процесс завершён. Код: ${code ?? signal}`);
      winwsProcess = null;
      setRunning(false);
    });

    startedAt = Date.now();
    setRunning(true);
    return { ok: true };
  } catch (e) {
    log('error', `Исключение: ${e.message}`);
    return { ok: false, err: e.message };
  }
}

async function stopEngine() {
  if (!isRunning) return { ok: true };
  log('info', '■ Остановка Zapret2...');
  try {
    if (winwsProcess) {
      winwsProcess.kill('SIGTERM');
      winwsProcess = null;
    }
    // Force-kill leftover processes on Windows
    if (IS_WIN) exec('taskkill /F /IM winws2.exe 2>nul', () => {});
    startedAt = null;
    setRunning(false);
    return { ok: true };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

function setRunning(val) {
  isRunning = val;
  refreshTrayMenu();
  notify('status-change', { running: val, startedAt });
}

// ─── Logging ──────────────────────────────────────────────
function log(level, text) {
  if (!text) return;
  const entry = { level, text, time: new Date().toISOString() };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) logBuffer.shift();
  notify('log-entry', entry);
  if (level === 'error') console.error(`[Engine ${level}] ${text}`);
}

function notify(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ─── IPC Handlers ─────────────────────────────────────────
const handle = (ch, fn) => ipcMain.handle(ch, async (_, ...a) => {
  try {
    return await fn(...a);
  } catch (err) {
    console.error(`[IPC Error: ${ch}]`, err);
    throw err;
  }
});

handle('store:get',    async (key)        => { const s = await getStore(); return key ? s.get(key) : s.store; });
handle('store:set',    async (key, value) => { const s = await getStore(); s.set(key, value); return true; });
handle('store:delete', async (key)        => { const s = await getStore(); s.delete(key); return true; });

handle('engine:start',  (args) => startEngine(args));
handle('engine:stop',   ()     => stopEngine());
handle('engine:status', ()     => ({ running: isRunning, startedAt }));
handle('engine:logs',   ()     => logBuffer);

handle('dialog:folder', () =>
  dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Выберите папку с бинарниками zapret2'
  }).then(r => r.canceled ? null : r.filePaths[0])
);

handle('dialog:exe', () =>
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Выберите исполняемый файл',
    filters: [{ name: 'Приложения', extensions: ['exe'] }]
  }).then(r => r.canceled ? null : r.filePaths[0])
);

handle('system:running-apps', () => new Promise(resolve => {
  exec('tasklist /FO CSV /NH', { timeout: 3000 }, (err, stdout) => {
    if (err || !stdout) return resolve([]);
    const seen = new Set();
    const apps = stdout.split('\n')
      .map(l => { const p = l.split('","'); return { name: (p[0] || '').replace(/"/g,''), pid: (p[1]||'').replace(/"/g,'') }; })
      .filter(a => a.name.endsWith('.exe') && !seen.has(a.name) && seen.add(a.name))
      .sort((a,b) => a.name.localeCompare(b.name));
    resolve(apps);
  });
}));

handle('system:is-admin', () => new Promise(resolve => {
  exec('net session', err => resolve(!err));
}));

handle('system:open-external', url => shell.openExternal(url));

// Screenshot for diagnostics
handle('system:screenshot', () => new Promise(resolve => {
  if (!mainWindow) return resolve(null);
  mainWindow.webContents.capturePage().then(img => {
    const outPath = path.join(APP_DIR, 'screenshot.png');
    fs.writeFileSync(outPath, img.toPNG());
    resolve(outPath);
  });
}));

// Auto DPI Strategy Scanner (Auto-Blockcheck)
handle('system:scan-strategies', async (event, targetUrl = 'https://www.youtube.com') => {
  log('info', `🎯 Запуск автоматического подбора стратегии для ${targetUrl}...`);

  const CANDIDATES = [
    {
        "name": "⭐ general (ALT)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (ALT10)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (ALT11)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (ALT12)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=3 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (ALT2)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2:seqovl=652 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (ALT3)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (ALT4)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (ALT5)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=80,443,2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=14"
    },
    {
        "name": "⭐ general (ALT6)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (ALT7)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2,sniext+1:seqovl=679 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2,sniext+1:seqovl=679 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=2,sniext+1:seqovl=679 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (ALT8)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (ALT9)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=4:tcp_ts_up --lua-desync=multisplit:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (EXP)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-tcp=443 --filter-l7=quic --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun,unknown --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=4:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=4:seqovl=480:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=480 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=4:seqovl=480:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=480 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=664:pos=1:tcp_ts_up --lua-desync=multisplit:pos=1:seqovl=664 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=5"
    },
    {
        "name": "⭐ general (FAKE TLS AUTO ALT)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (FAKE TLS AUTO ALT2)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (FAKE TLS AUTO ALT3)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=8:seqovl=681:pos=1:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (FAKE TLS AUTO)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=11:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=11:pos=1,midsld:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --lua-desync=multidisorder:pos=1,midsld --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (SIMPLE FAKE ALT)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_seq=-10000:tcp_ack=-66000:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=10"
    },
    {
        "name": "⭐ general (SIMPLE FAKE ALT2)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general (SIMPLE FAKE)",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=fake:blob=fake_default_tls:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=http_req --lua-desync=fake:blob=fake_default_http:repeats=6:tcp_ts_up:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    },
    {
        "name": "⭐ general",
        "args": "--wf-tcp-out=80,443,2053,2083,2087,2096,8443,27015-27050 --wf-udp-out=443,19294-19344,50000-50100,27015-27050 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-udp=19294-19344,50000-50100 --filter-l7=discord,stun --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6 --new --filter-tcp=2053,2083,2087,2096,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=681 --new --filter-tcp=80,443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=568 --new --filter-udp=443 --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=6:tls_mod=rnd,dupsid,sni=www.google.com --new --filter-tcp=80,443,8443 --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=568 --new --filter-tcp=%GameFilterTCP% --out-range=-d10 --payload=tls_client_hello --lua-desync=multisplit:pos=1:seqovl=568 --new --filter-udp=%GameFilterUDP% --out-range=-d10 --payload=quic_initial --lua-desync=fake:blob=fake_default_quic:repeats=12"
    }
];

  await stopEngine();

  for (let i = 0; i < CANDIDATES.length; i++) {
    const cand = CANDIDATES[i];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scan-progress', { index: i + 1, total: CANDIDATES.length, name: cand.name });
    }

    const res = await startEngine(cand.args);
    if (!res.ok) continue;

    await new Promise(r => setTimeout(r, 1200));

    const ok = await testUrlReachability(targetUrl);
    await stopEngine();

    if (ok) {
      log('info', `🎉 Найдена работающая стратегия: ${cand.name}`);
      const store = await getStore();
      const profiles = store.get('profiles', {});
      profiles.default = {
        name: cand.name,
        args: cand.args,
        luaInit: '@zapret-antidpi.lua',
        color: '#10b981'
      };
      store.set('profiles', profiles);
      store.set('activeProfile', 'default');
      await startEngine(); // restart with winner
      return { ok: true, workingStrategy: cand.name, index: i + 1 };
    }
  }

  return { ok: false, err: 'Ни одна из известных стратегий не смогла открыть узел.' };
});

function testUrlReachability(targetUrl) {
  return new Promise(resolve => {
    try {
      const u = new URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
      const httpModule = u.protocol === 'https:' ? require('https') : require('http');
      const req = httpModule.request(u.href, { method: 'HEAD', timeout: 3500 }, res => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch (_) {
      resolve(false);
    }
  });
}

// Window controls
handle('win:minimize',  () => mainWindow?.minimize());
handle('win:maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
handle('win:close',     async () => {
  const s = await getStore();
  if (s.get('minimizeToTray') && tray && !app.isQuitting) {
    mainWindow?.hide();
    try {
      tray.displayBalloon?.({
        title: 'Zapret2 Manager',
        content: 'Приложение свёрнуто в трей и продолжает работать в фоне',
        icon: nativeImage.createEmpty()
      });
    } catch (_) {}
  } else {
    app.isQuitting = true;
    mainWindow?.close();
  }
});
handle('win:is-maximized', () => mainWindow?.isMaximized() ?? false);

// ─── App Lifecycle ────────────────────────────────────────
app.whenReady().then(async () => {
  // Security: disable navigation to external URLs
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data:"] } });
  });

  await createWindow();
  createTray();

  const store = await getStore();
  if (store.get('autoStart')) {
    setTimeout(startEngine, 2500);
  }

  log('info', `Zapret2 Manager v1.1 запущен (${IS_DEV ? 'DEV' : 'PROD'})`);
  log('info', `Платформа: ${process.platform} ${os.arch()} | Node ${process.version}`);
  log('info', `Папка binaries: ${BIN_DIR}`);
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopEngine();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
  else mainWindow.show();
});

process.on('uncaughtException', err => {
  console.error('[Main Uncaught Exception]', err);
  try {
    fs.appendFileSync(path.join(APP_DIR, 'crash.log'), `[${new Date().toISOString()}] ${err.stack || err}\n`);
  } catch (_) {}
});

