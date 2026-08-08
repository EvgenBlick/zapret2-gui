/**
 * preload.js — Isolated contextBridge
 * Exposes a clean, typed API to the renderer.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (ch, ...args) => ipcRenderer.invoke(ch, ...args);

contextBridge.exposeInMainWorld('api', {
  // ── Store ──────────────────────────────────────────────
  store: {
    get:    (key)        => invoke('store:get', key),
    set:    (key, value) => invoke('store:set', key, value),
    delete: (key)        => invoke('store:delete', key),
    getAll: ()           => invoke('store:get')
  },

  // ── Engine control ─────────────────────────────────────
  engine: {
    start:  (args) => invoke('engine:start', args),
    stop:   ()     => invoke('engine:stop'),
    status: ()     => invoke('engine:status'),
    logs:   ()     => invoke('engine:logs')
  },

  // ── File dialogs ───────────────────────────────────────
  dialog: {
    folder: () => invoke('dialog:folder'),
    exe:    () => invoke('dialog:exe')
  },

  // ── System ────────────────────────────────────────────
  system: {
    runningApps:    ()          => invoke('system:running-apps'),
    isAdmin:        ()          => invoke('system:is-admin'),
    openExternal:   (url)       => invoke('system:open-external', url),
    screenshot:     ()          => invoke('system:screenshot'),
    scanStrategies: (targetUrl) => invoke('system:scan-strategies', targetUrl)
  },

  // ── Window controls ───────────────────────────────────
  win: {
    minimize:    () => invoke('win:minimize'),
    maximize:    () => invoke('win:maximize'),
    close:       () => invoke('win:close'),
    isMaximized: () => invoke('win:is-maximized')
  },

  // ── IPC Events ────────────────────────────────────────
  on: {
    statusChange: (cb) => {
      const listener = (_, data) => cb(data);
      ipcRenderer.on('status-change', listener);
      return () => ipcRenderer.removeListener('status-change', listener);
    },
    logEntry: (cb) => {
      const listener = (_, data) => cb(data);
      ipcRenderer.on('log-entry', listener);
      return () => ipcRenderer.removeListener('log-entry', listener);
    },
    scanProgress: (cb) => {
      const listener = (_, data) => cb(data);
      ipcRenderer.on('scan-progress', listener);
      return () => ipcRenderer.removeListener('scan-progress', listener);
    }
  }
});
