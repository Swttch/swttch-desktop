import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { desktopApi } from './api';
import { API_PATH } from '../../src/api-paths.mjs';
import { replacePathParams } from './routes';
import type { WorkspaceView } from '../../src/workspace-layout.mjs';
import '@xterm/xterm/css/xterm.css';

export function TerminalView({ tab, onFocus, onTitle }: { tab: WorkspaceView; onFocus: (interaction: boolean) => void; onTitle: (title: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onFocus, onTitle }); callbacks.current = { onFocus, onTitle };
  const [status, setStatus] = useState('');
  const input = useMutation({ scope: { id: `terminal-input-${tab.terminalId}` }, mutationFn: (data: string) => desktopApi.terminalInput(tab.terminalId!, data), onError: error => setStatus(error.message) });
  const resize = useMutation({ scope: { id: `terminal-resize-${tab.terminalId}` }, mutationFn: ({ cols, rows }: { cols: number; rows: number }) => desktopApi.resizeTerminal(tab.terminalId!, cols, rows), onError: error => setStatus(error.message) });
  const mutations = useRef({ input, resize }); mutations.current = { input, resize };
  useEffect(() => {
    const element = root.current, id = tab.terminalId;
    if (!element || !id) return;
    const terminal = new Terminal({ fontSize: 12, fontFamily: 'Menlo, Monaco, Consolas, monospace', cursorBlink: true, screenReaderMode: true, scrollback: 5000, theme: { background: '#1a1a1a', foreground: '#ededed', cursor: '#ededed', selectionBackground: '#365578' } });
    const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(element);
    element.querySelector('textarea')?.setAttribute('aria-label', '터미널 입력');
    const data = terminal.onData(value => { for (let start = 0; start < value.length; start += 2048) mutations.current.input.mutate(value.slice(start, start + 2048)); });
    const title = terminal.onTitleChange(value => callbacks.current.onTitle(value || tab.title));
    const dimensions = terminal.onResize(size => mutations.current.resize.mutate(size));
    let frame = 0;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => { if (element.clientWidth > 20 && element.clientHeight > 20) { fit.fit(); terminal.refresh(0, terminal.rows - 1); } }); };
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    element.addEventListener('terminal-refresh', measure);
    const events = new EventSource(replacePathParams(API_PATH.TERMINAL_EVENTS, { terminalId: id }));
    events.onopen = () => setStatus('');
    events.onmessage = event => {
      const packet = JSON.parse(event.data) as { type: string; data?: string; exitCode?: number };
      if (packet.type === 'data' && packet.data) terminal.write(packet.data);
      if (packet.type === 'exit') { setStatus(`셸 종료 · 코드 ${packet.exitCode}`); events.close(); }
    };
    events.onerror = () => setStatus('터미널 연결을 다시 시도하고 있습니다…');
    terminal.focus();
    return () => {
      events.close(); observer.disconnect(); cancelAnimationFrame(frame); data.dispose(); title.dispose(); dimensions.dispose(); element.removeEventListener('terminal-refresh', measure); terminal.dispose();
      void desktopApi.closeTerminal(id).catch(() => {});
    };
  }, [tab.id, tab.terminalId]);
  return <div className="relative size-full bg-canvas p-3" onFocusCapture={() => callbacks.current.onFocus(false)} onPointerDown={() => callbacks.current.onFocus(true)} onKeyDownCapture={() => callbacks.current.onFocus(true)}>
    <div ref={root} data-terminal-id={tab.terminalId} className="size-full min-h-0 min-w-0" />
    {status && <p role="status" className="pointer-events-none absolute right-3 bottom-1 left-3 bg-canvas text-[11px] text-muted">{status}</p>}
  </div>;
}
