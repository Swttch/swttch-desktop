import { useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { desktopApi } from './api';
import { bindScopedShortcuts } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts } from './shortcut-platform';

export function DesktopSettings({ onClose, onHelp }: { onClose: () => void; onHelp: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const requested = useRef(false);
  const cleanup = useRef<() => void>(() => {});
  const callbacks = useRef({ onClose, onHelp }); callbacks.current = { onClose, onHelp };
  const view = useMutation({ mutationFn: desktopApi.settingsView });
  useEffect(() => { dialog.current?.showModal(); if (!requested.current) { requested.current = true; view.mutate(); } return () => cleanup.current(); }, []);
  return <dialog ref={dialog} aria-label="데스크탑 설정" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} className="fixed inset-0 m-auto! flex h-[min(48rem,calc(100dvh-3rem))] w-[min(64rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-lg border border-divider bg-canvas text-foreground backdrop:bg-black/50"><div className="flex items-center justify-between border-b border-divider px-4 py-2"><h2 className="text-sm font-medium">설정</h2><button type="button" aria-label="설정 닫기" className="icon-button" onClick={onClose}>×</button></div>{view.data ? <iframe title="데스크탑 설정 화면" src={view.data.url} className="min-h-0 w-full flex-1 border-0" onLoad={event => { cleanup.current(); const content = event.currentTarget.contentWindow; if (content) cleanup.current = bindScopedShortcuts(content, macShortcuts, command => { if (command === 'close') callbacks.current.onClose(); if (command === 'help') callbacks.current.onHelp(); }); }} /> : <p role="status" className="p-4 text-sm text-muted">{view.error?.message || '설정을 불러오는 중…'}</p>}</dialog>;
}
