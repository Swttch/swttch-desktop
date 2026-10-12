const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { createWorkspaceRecord } = require("../src/workspace-record.cjs");
const { workspaceSnapshot } = require("../src/workspace-layout.mjs");
const layout = () => ({ kind: "panel", id: "p", tabs: [{ id: "a", projectId: 1, projectPath: "/tmp", sessionId: "", title: "Chat", customTitle: "Mine", url: "http://localhost/sessions/new?pair=SECRET", terminalId: "private-process" }], activeTabId: "a", focusHistory: ["a"] });
const snapshot = () => workspaceSnapshot(layout(), "p", ["a"]);
test("workspace records survive reopening and exclude transient credentials and processes", t => {
  const home = mkdtempSync(join(tmpdir(), "swttch-record-")); t.after(() => rmSync(home, { recursive: true, force: true }));
  const store = createWorkspaceRecord(home);
  assert.equal(store.read(), null);
  const saved = store.write(snapshot(), 0);
  assert.equal(saved.revision, 1);
  assert.deepEqual(createWorkspaceRecord(home).read(), saved);
  const file = readFileSync(join(home, "workspace.json"), "utf8");
  assert.equal(file.includes("SECRET"), false); assert.equal(file.includes("private-process"), false);
  assert.equal(statSync(join(home, "workspace.json")).mode & 0o777, 0o600);
  assert.equal(saved.layout.tabs[0].customTitle, "Mine");
  assert.throws(() => store.write(snapshot(), 0), /conflict/i);
  assert.deepEqual(store.read(), saved);
});
test("invalid state cannot replace a good record; damaged latest file recovers previous complete record", t => {
  const home = mkdtempSync(join(tmpdir(), "swttch-record-")); t.after(() => rmSync(home, { recursive: true, force: true }));
  const store = createWorkspaceRecord(home), first = store.write(snapshot(), 0);
  store.write({ ...snapshot(), focusHistory: [] }, 1);
  assert.throws(() => store.write({ ...snapshot(), layout: { kind: "split", id: "s", children: [] } }, 2));
  assert.throws(() => store.write({ ...snapshot(), layout: { ...layout(), tabs: [layout().tabs[0], layout().tabs[0]] } }, 2));
  writeFileSync(join(home, "workspace.json"), "{broken");
  assert.deepEqual(createWorkspaceRecord(home).read(), first);
  assert.equal(createWorkspaceRecord(home).write(snapshot(), 1).revision, 2);
});
test("unsupported versions or two damaged files are explicit errors rather than silently discarded state", t => {
  const home = mkdtempSync(join(tmpdir(), "swttch-record-")); t.after(() => rmSync(home, { recursive: true, force: true }));
  writeFileSync(join(home, "workspace.json"), JSON.stringify({ ...snapshot(), version: 99, revision: 1 }));
  assert.throws(() => createWorkspaceRecord(home).read());
});
