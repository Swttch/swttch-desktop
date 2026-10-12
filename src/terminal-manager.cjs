const { randomUUID } = require('node:crypto');
const { basename } = require('node:path');

function createTerminalManager({ idleTimeoutMs = 30000, spawn = (...args) => require('node-pty').spawn(...args) } = {}) {
  const terminals = new Map();
  const remove = row => { clearTimeout(row.idleTimer); terminals.delete(row.id); if (!row.exited) { try { row.pty.kill(); } catch {} } row.listeners.clear(); };
  const reclaim = row => { clearTimeout(row.idleTimer); row.idleTimer = setTimeout(() => { if (!row.listeners.size && terminals.has(row.id)) remove(row); }, idleTimeoutMs); row.idleTimer.unref(); };
  const metadata = row => ({ id: row.id, projectId: row.projectId, projectPath: row.projectPath, title: row.title, cols: row.cols, rows: row.rows, exited: row.exited, exitCode: row.exitCode });
  const owned = (id, owner) => { const row = terminals.get(id); if (!row || row.owner !== owner) throw new Error('터미널을 찾을 수 없습니다.'); return row; };
  return {
    create(owner, project) {
      if ([...terminals.values()].filter(row => row.owner === owner).length >= 32) throw new Error('열린 터미널을 닫은 뒤 다시 시도해 주세요.');
      const shell = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : process.env.SHELL || '/bin/sh';
      const env = { ...process.env, TERM: 'xterm-256color' }; delete env.CLAUDECODE;
      const pty = spawn(shell, process.platform === 'win32' ? [] : ['-l'], { cwd: project.path, env, name: 'xterm-256color', cols: 80, rows: 24 });
      const row = { id: randomUUID(), owner, projectId: project.id, projectPath: project.path, title: basename(shell), pty, cols: 80, rows: 24, exited: false, exitCode: null, sequence: 0, bytes: 0, buffer: [], listeners: new Set() };
      terminals.set(row.id, row); reclaim(row);
      const emit = packet => {
        const entry = { ...packet, sequence: ++row.sequence }; row.buffer.push(entry); row.bytes += JSON.stringify(entry).length;
        while (row.bytes > 1024 * 1024 && row.buffer.length > 1) row.bytes -= JSON.stringify(row.buffer.shift()).length;
        for (const listener of row.listeners) listener(entry);
      };
      pty.onData(data => emit({ type: 'data', data }));
      pty.onExit(({ exitCode }) => { row.exited = true; row.exitCode = exitCode; emit({ type: 'exit', exitCode }); });
      return metadata(row);
    },
    get(id, owner) { const row = terminals.get(id); return row?.owner === owner ? metadata(row) : null; },
    input(id, owner, data) { const row = owned(id, owner); if (row.exited) throw new Error('종료된 터미널입니다.'); if (typeof data !== 'string' || data.length > 8192) throw new Error('터미널 입력을 확인해 주세요.'); row.pty.write(data); },
    resize(id, owner, cols, rows) { const row = owned(id, owner); if (![cols, rows].every(value => Number.isInteger(value) && value >= 2 && value <= 500)) throw new Error('터미널 크기를 확인해 주세요.'); if (!row.exited) row.pty.resize(cols, rows); row.cols = cols; row.rows = rows; },
    subscribe(id, owner, sequence, listener) { const row = owned(id, owner); clearTimeout(row.idleTimer); for (const packet of row.buffer) if (packet.sequence > sequence) listener(packet); row.listeners.add(listener); return () => { row.listeners.delete(listener); if (!row.listeners.size && terminals.has(row.id)) reclaim(row); }; },
    remove(id, owner) { remove(owned(id, owner)); },
    stop() { for (const row of [...terminals.values()]) this.remove(row.id, row.owner); },
  };
}
module.exports = { createTerminalManager };
