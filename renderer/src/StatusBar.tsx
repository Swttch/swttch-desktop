import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { desktopApi } from './api';
import { DesktopPhase, type DesktopState } from './desktop';
import { QUERY_KEY, queryClient } from './query-client';
import { Tooltip } from './Tooltip';

enum Panel { Connection = 'connection' }

export function StatusBar({ state }: { state: DesktopState }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const root = useRef<HTMLElement>(null);
  const connectionButton = useRef<HTMLButtonElement>(null);
  const reconnect = useMutation({ mutationFn: desktopApi.retry, onSuccess: data => queryClient.setQueryData(QUERY_KEY.workspace, data) });
  useEffect(() => {
    if (!panel) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPanel(null);
      connectionButton.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    const blur = () => { if (document.activeElement instanceof HTMLIFrameElement) setPanel(null); };
    window.addEventListener('blur', blur);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('blur', blur); };
  }, [panel]);
  const ready = state.phase === DesktopPhase.Ready || state.phase === DesktopPhase.Chat;
  const connectionLabel = ready ? '로컬 연결됨' : state.phase === DesktopPhase.Error ? '연결 종료' : '연결 중';
  return <footer ref={root} className="relative flex h-8 shrink-0 items-center justify-end gap-3 border-t border-divider bg-navigation px-3 text-xs text-muted" aria-label="공통 상태바">
    <Tooltip content="CCG 백엔드 연결 상태" placement="top-end">
      <button ref={connectionButton} type="button" className="flex shrink-0 items-center gap-2 rounded px-2 py-1 hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground" aria-expanded={panel === Panel.Connection} aria-controls="backend-connection-panel" onClick={() => setPanel(panel === Panel.Connection ? null : Panel.Connection)}><span aria-hidden="true" className={`size-1.5 rounded-full ${ready ? 'bg-status' : 'bg-muted'}`} /><span>{connectionLabel}</span></button>
    </Tooltip>
    {panel === Panel.Connection && <section id="backend-connection-panel" aria-label="백엔드 연결 상세" className="absolute right-3 bottom-full z-50 mb-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-divider bg-navigation p-4 text-sm text-foreground"><h2 className="font-medium">CCG 백엔드</h2><p role="status" className="mt-3">{connectionLabel}</p><p className="mt-2 text-xs leading-5 text-muted">{ready ? '채팅 환경에 연결돼 있습니다.' : state.message}</p>{state.phase === DesktopPhase.Error && <button type="button" className="secondary-button mt-4" disabled={reconnect.isPending} onClick={() => reconnect.mutate()}>{reconnect.isPending ? '연결 중…' : '다시 연결'}</button>}{reconnect.error && <p role="alert" className="mt-3 text-xs text-muted">{reconnect.error.message}</p>}</section>}
  </footer>;
}
