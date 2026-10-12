import { useEffect, useRef, useState } from 'react';
import type { WorkspaceView } from '../../src/workspace-layout.mjs';
import { sessionFrameUrl } from './session-view';
import { bindScopedShortcuts, type DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from './shortcut-platform';

export function WorkspaceFrame({ tab, hidden, register, onMetadata, onFocus, onShortcut }: { tab: WorkspaceView; hidden: boolean; register: (id: string, frame: HTMLIFrameElement | null) => void; onMetadata: (id: string, title: string, sessionId: string, url: string) => void; onFocus: () => void; onShortcut: (id: string, command: DesktopCommand) => void }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const instance = useRef(crypto.randomUUID());
  const cleanup = useRef<() => void>(() => {});
  const callbacks = useRef({ onMetadata, onFocus, onShortcut });
  callbacks.current = { onMetadata, onFocus, onShortcut };
  const source = useRef(sessionFrameUrl(tab.url, window.location.origin));
  useEffect(() => {
    if (ready || error) return;
    const timeout = setTimeout(() => { if (!ready) setError('대화를 불러오지 못했습니다. 다시 시도해 주세요.'); }, 30_000);
    return () => clearTimeout(timeout);
  }, [ready, error, attempt]);
  useEffect(() => () => { cleanup.current(); register(tab.id, null); }, [tab.id, register]);
  function bind(frame: HTMLIFrameElement) {
    cleanup.current(); register(tab.id, frame);
    const content = frame.contentWindow;
    if (!content) return;
    let initialized = false;
    const expected = new URL(source.current);
    const sync = () => {
      try {
        const url = new URL(content.location.href);
        const title = content.document.title;
        if (!url.searchParams.get('workingDir') || (!initialized && url.searchParams.get('workingDir') !== expected.searchParams.get('workingDir'))) return;
        if (!initialized && url.pathname !== expected.pathname) {
          if (expected.pathname !== '/sessions/new' && url.pathname === '/sessions/new') setError('선택한 세션을 불러오지 못했습니다. 프로젝트와 세션을 다시 확인해 주세요.');
          return;
        }
        if (!initialized && expected.pathname !== '/sessions/new' && (!title || title === 'Claude Code')) return;
        const uid = /^\/sessions\/([^/]+)/.exec(url.pathname)?.[1];
        const sessionId = uid && uid !== 'new' ? uid : '';
        callbacks.current.onMetadata(tab.id, title && title !== 'Claude Code' ? title : '새 채팅', sessionId, url.href);
        initialized = true; setReady(true); setError('');
      } catch { setError('채팅 화면에 연결하지 못했습니다.'); }
    };
    const removeKeys = bindScopedShortcuts(content, macShortcuts, command => callbacks.current.onShortcut(tab.id, command), browserShortcuts);
    const focus = () => callbacks.current.onFocus();
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(content.document.head, { childList: true, characterData: true, subtree: true });
    const timer = setInterval(sync, 500);
    content.addEventListener('focus', focus); content.addEventListener('pointerdown', focus, true);
    cleanup.current = () => { removeKeys(); observer.disconnect(); clearInterval(timer); content.removeEventListener('focus', focus); content.removeEventListener('pointerdown', focus, true); };
  }
  return <div className={`absolute inset-0 ${hidden ? 'hidden' : ''}`}>
    <iframe key={attempt} data-view-instance={instance.current} className="block size-full border-0" title={`Swttch 채팅 ${tab.id}`} src={source.current} onLoad={event => bind(event.currentTarget)} />
    {(!ready || error) && <div className="absolute inset-0 grid place-items-center bg-canvas p-4 text-sm text-muted"><div>{error || '대화를 불러오는 중…'}{error && <button className="secondary-button mt-3 block" onClick={() => { cleanup.current(); setReady(false); setError(''); setAttempt(value => value + 1); }}>다시 시도</button>}</div></div>}
  </div>;
}
