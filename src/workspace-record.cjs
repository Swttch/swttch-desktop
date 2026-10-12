const { readFileSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const { workspaceSnapshot, panels } = require("./workspace-layout.mjs");

function validateSnapshot(value) {
  const ids = new Set(); let count = 0;
  const text = (value, limit = 512) => typeof value === "string" && value.length <= limit;
  function unique(id) { if (!text(id, 128) || !/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw new Error("Invalid workspace identifier"); ids.add(id); }
  function node(current, depth = 0) {
    if (!current || ++count > 255 || depth > 32) throw new Error("Invalid workspace tree");
    unique(current.id);
    if (current.kind === "split") {
      if (!["columns", "rows"].includes(current.direction) || !Number.isFinite(current.ratio) || current.ratio < .15 || current.ratio > .85 || !Array.isArray(current.children) || current.children.length !== 2) throw new Error("Invalid workspace split");
      current.children.forEach(child => node(child, depth + 1)); return;
    }
    if (current.kind !== "panel" || !Array.isArray(current.tabs) || current.tabs.length > 64) throw new Error("Invalid workspace panel");
    current.tabs.forEach(tab => {
      unique(tab.id);
      if (!["chat", "terminal", undefined].includes(tab.kind) || !Number.isSafeInteger(tab.projectId) || tab.projectId < 1 || !text(tab.title) || !text(tab.sessionId, 128) || (tab.sessionId && !/^[a-f0-9-]{36}$/i.test(tab.sessionId)) || (tab.customTitle !== undefined && !text(tab.customTitle))) throw new Error("Invalid workspace tab");
    });
    if (current.activeTabId !== null && !current.tabs.some(tab => tab.id === current.activeTabId)) throw new Error("Invalid selected tab");
    if (current.tabs.length && current.activeTabId === null) throw new Error("Missing selected tab");
    if (!Array.isArray(current.focusHistory) || current.focusHistory.length > 64 || current.focusHistory.some(id => !current.tabs.some(tab => tab.id === id))) throw new Error("Invalid panel focus history");
  }
  if (!value || value.version !== 1) throw new Error("Unsupported workspace record version");
  node(value.layout);
  const leaves = panels(value.layout), tabIds = new Set(leaves.flatMap(panel => panel.tabs.map(tab => tab.id)));
  if (!leaves.some(panel => panel.id === value.activePanel) || !Array.isArray(value.focusHistory) || value.focusHistory.length > ids.size || value.focusHistory.some(id => !tabIds.has(id))) throw new Error("Invalid workspace focus");
  if (tabIds.size > 64) throw new Error("Too many workspace tabs");
  return workspaceSnapshot(value.layout, value.activePanel, value.focusHistory);
}
function createWorkspaceRecord(home) {
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const path = join(home, "workspace.json"), backup = path + ".bak";
  function load(file) {
    try {
      const value = JSON.parse(readFileSync(file, "utf8"));
      if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error("Invalid workspace revision");
      return { ...validateSnapshot(value), revision: value.revision };
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  function read() {
    try { return load(path) || load(backup); }
    catch (error) { const previous = load(backup); if (previous) return previous; throw error; }
  }
  function atomic(file, value) {
    const temporary = file + "." + randomUUID() + ".tmp";
    let descriptor;
    try {
      descriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify(value) + "\n"); fsyncSync(descriptor); closeSync(descriptor); descriptor = undefined;
      renameSync(temporary, file);
      // Persist the directory entry on systems that support directory fsync.
      if (process.platform !== "win32") { const directory = openSync(home, "r"); try { fsyncSync(directory); } finally { closeSync(directory); } }
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
      try { unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
  }
  return { read, write(value, expectedRevision) {
    const clean = validateSnapshot(value), previous = read();
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== (previous?.revision || 0)) {
      const error = new Error("Workspace revision conflict. Reload before editing this workspace."); error.status = 409; throw error;
    }
    const next = { ...clean, revision: expectedRevision + 1 };
    if (previous) atomic(backup, previous);
    atomic(path, next); return next;
  } };
}
module.exports = { createWorkspaceRecord, validateSnapshot };
