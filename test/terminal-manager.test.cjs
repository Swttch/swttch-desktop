const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTerminalManager } = require('../src/terminal-manager.cjs');
test('terminal output replays in order, owner isolation and closure preserve siblings', () => {
  const processes = [];
  const manager = createTerminalManager({ spawn: (shell, args, options) => {
    const process = { options, onData(cb) { this.data = cb; }, onExit(cb) { this.exit = cb; }, write(data) { this.input = data; }, resize(cols, rows) { this.size = [cols, rows]; }, kill() { this.killed = true; } }; processes.push(process); return process;
  } });
  const first = manager.create('owner', { id: 1, path: '/tmp' });
  const second = manager.create('owner', { id: 1, path: '/tmp' });
  assert.equal(processes[0].options.cwd, '/tmp'); assert.equal(manager.get(first.id, 'other'), null);
  processes[0].data('one'); processes[0].data('two');
  const received = []; const stop = manager.subscribe(first.id, 'owner', 0, packet => received.push(packet));
  assert.deepEqual(received.map(packet => packet.data), ['one', 'two']);
  stop(); const resumed = []; manager.subscribe(first.id, 'owner', 1, packet => resumed.push(packet)); assert.deepEqual(resumed.map(packet => packet.data), ['two']);
  manager.input(first.id, 'owner', 'pwd\r'); assert.equal(processes[0].input, 'pwd\r');
  assert.throws(() => manager.resize(first.id, 'owner', -1, 30));
  manager.resize(first.id, 'owner', 100, 30); assert.deepEqual(processes[0].size, [100, 30]);
  manager.remove(first.id, 'owner'); assert.equal(processes[0].killed, true); assert.equal(processes[1].killed, undefined);
  assert.equal(manager.get(first.id, 'owner'), null); assert.ok(manager.get(second.id, 'owner'));
  manager.stop(); assert.equal(processes[1].killed, true);
});
test('unattached or disconnected terminals are reclaimed after a reconnect grace period', async () => {
  let killed = 0;
  const manager = createTerminalManager({ idleTimeoutMs: 10, spawn: () => ({ onData() {}, onExit() {}, kill() { killed++; } }) });
  const first = manager.create('owner', { id: 1, path: '/tmp' });
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(manager.get(first.id, 'owner'), null); assert.equal(killed, 1);
  const second = manager.create('owner', { id: 1, path: '/tmp' });
  const disconnect = manager.subscribe(second.id, 'owner', 0, () => {});
  await new Promise(resolve => setTimeout(resolve, 25)); assert.ok(manager.get(second.id, 'owner'));
  disconnect(); await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(manager.get(second.id, 'owner'), null); assert.equal(killed, 2);
  manager.stop();
});
test('closing a shell that already disappeared still releases its resource', () => {
  const manager = createTerminalManager({ spawn: () => ({ onData() {}, onExit() {}, kill() { throw new Error('Process already exited'); } }) });
  const terminal = manager.create('owner', { id: 1, path: '/tmp' });
  assert.doesNotThrow(() => manager.remove(terminal.id, 'owner'));
  assert.equal(manager.get(terminal.id, 'owner'), null); manager.stop();
});
