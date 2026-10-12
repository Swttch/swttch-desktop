import { useEffect, useRef, useState } from 'react';
import { shortcutLabel, type DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts } from './shortcut-platform';
import type { ShortcutRow } from './tab-action';

const entries: { command: DesktopCommand; label: string }[] = [
  { command: 'new-tab', label: '새 채팅 탭' }, { command: 'split-columns', label: '좌우 분할로 열기' }, { command: 'split-rows', label: '상하 분할로 열기' }, { command: 'rename', label: '탭 이름 변경' }, { command: 'favorite', label: '대화 즐겨찾기 설정/해제' }, { command: 'close', label: '현재 탭 닫기' }, { command: 'tab-left', label: '이전 탭으로 이동' }, { command: 'tab-right', label: '다음 탭으로 이동' }, { command: 'panel-left', label: '왼쪽 패널로 이동' }, { command: 'panel-right', label: '오른쪽 패널로 이동' }, { command: 'panel-up', label: '위 패널로 이동' }, { command: 'panel-down', label: '아래 패널로 이동' }, { command: 'sidebar', label: '사이드메뉴 표시/숨기기' }, { command: 'help', label: '데스크탑 도움말 열기/닫기' }, { command: 'settings', label: '설정 열기' },
];
const applicable = new Set(['openModelMenu', 'rotateModel', 'clearConversation', 'sendMessage', 'insertNewline', 'cyclePermissionMode', 'recallPrompt', 'toggleDictation', 'lineEdges', 'textStart', 'textEnd', 'wordMove', 'emacsParagraphEdges', 'emacsCharacterMove', 'emacsLineMove', 'emacsDelete', 'emacsKill', 'emacsYank', 'emacsTranspose', 'emacsOpenLine', 'emacsPageDown', 'emacsCenter']);
export function DesktopHelp({ getShortcuts, onClose }: { getShortcuts: () => Promise<ShortcutRow[]>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<ShortcutRow[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    let alive = true;
    void getShortcuts().then(data => { if (alive) setRows(data); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; if (focused?.isConnected) focused.focus(); };
  }, []);
  const owned = new Set(entries.map(entry => shortcutLabel(entry.command, macShortcuts).replace(/\+/g, '')));
  const common = rows.filter(row => applicable.has(row.id)).map(row => ({ ...row, combos: row.combos.filter(combo => !owned.has(combo.join('').replace(/\+/g, ''))) })).filter(row => row.combos.length);
  return <dialog ref={dialog} aria-label="데스크탑 도움말" onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} className="fixed inset-0 m-auto! flex max-h-[85dvh] w-[min(38rem,calc(100vw-2rem))] flex-col rounded-lg border border-divider bg-navigation p-5 text-foreground backdrop:bg-black/50">
    <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">데스크탑 도움말</h2><button type="button" aria-label="도움말 닫기" className="icon-button" onClick={onClose}>×</button></div>
    <div className="min-h-0 overflow-y-auto text-sm"><h3 className="mb-2 font-medium text-muted">탭과 패널</h3>{entries.map(entry => <div key={entry.command} className="flex items-center justify-between gap-4 border-b border-divider py-2"><span>{entry.label}</span><kbd className="shrink-0 text-xs text-muted">{shortcutLabel(entry.command, macShortcuts)}</kbd></div>)}
      {!!common.length && <section className="mt-5"><h3 className="mb-2 font-medium text-muted">채팅과 텍스트 편집</h3>{common.map(row => <div key={row.id} className="flex items-center justify-between gap-4 border-b border-divider py-2"><span>{row.label}</span><span className="shrink-0 text-xs text-muted">{row.combos.map(combo => combo.join(macShortcuts ? '' : '+')).join(' / ')}</span></div>)}</section>}
      {failed && <p role="status" className="mt-4 text-xs text-muted">채팅 단축키 정보를 가져오지 못했습니다. 탭을 불러온 뒤 다시 열어 주세요.</p>}
    </div>
  </dialog>;
}
