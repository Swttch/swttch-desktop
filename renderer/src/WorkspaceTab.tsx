import { useEffect, useRef, useState } from 'react';
import claudeLogo from './assets/claude-logo.svg';
import { Tooltip } from './Tooltip';
import { Dropdown } from './Dropdown';
import type { DesktopTabAction } from './tab-action';

function RenameTab({ title, onSave, onClose }: { title: string; onSave: (value: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(title);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-label="탭 이름 변경" onCancel={onClose} className="fixed inset-0 m-auto! w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-divider bg-navigation p-4 text-foreground backdrop:bg-black/50"><form onSubmit={event => { event.preventDefault(); if (value.trim()) onSave(value.trim()); }}><h2 className="mb-3 text-sm font-medium">탭 이름 변경</h2><input autoFocus aria-label="탭 이름" value={value} maxLength={120} onChange={event => setValue(event.target.value)} className="field w-full" /><div className="mt-4 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onClose}>취소</button><button type="submit" disabled={!value.trim()} className="primary-button">저장</button></div></form></dialog>;
}

export function WorkspaceTab({ title, selected, pending, running, onSelect, onClose, onAction }: { title: string; selected: boolean; pending: boolean; running: boolean; onSelect: () => void; onClose: () => void; onAction: (action: DesktopTabAction) => void }) {
  const [customTitle, setCustomTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const closeMenu = useRef<(() => void) | null>(null);
  const label = customTitle || title;
  const activate = (action: () => void) => { closeMenu.current?.(); action(); };
  const menu = <section role="menu" aria-label="탭 메뉴" className="w-52 rounded-lg border border-divider bg-navigation p-1 text-sm text-foreground" onKeyDown={event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }}>
    <button role="menuitem" className="project-menu-item" onClick={() => activate(() => setRenaming(true))}>이름 변경</button>
    {customTitle && <button role="menuitem" className="project-menu-item" onClick={() => activate(() => setCustomTitle(''))}>자동 이름으로 복원</button>}
    <div className="my-1 border-t border-divider" />
    {([{ id: 'scheduled-messages', label: '예약된 메시지' }, { id: 'background-tasks', label: '백그라운드 작업' }, { id: 'tunnel', label: '원격 터널' }, { id: 'assets', label: '에셋' }] as const).map(item => <button key={item.id} role="menuitem" disabled={pending} className="project-menu-item" onClick={() => activate(() => onAction(item.id))}>{item.label}</button>)}
    <div className="my-1 border-t border-divider" /><button role="menuitem" disabled={pending} className="project-menu-item" onClick={() => activate(onClose)}>탭 닫기</button>
  </section>;
  return <><Dropdown contextMenu content={menu} closeRef={closeMenu}><div className={`workspace-tab group flex h-full min-w-0 max-w-60 shrink-0 items-center border-r border-divider border-b-2 ${selected ? 'border-b-muted bg-selected' : 'border-b-transparent hover:bg-hover'}`}>
    <Tooltip content={running ? `${label} · 진행 중` : label} placement="bottom-start"><button id="current-chat-tab" type="button" role="tab" aria-selected={selected} aria-controls="viewport" className="flex h-full min-w-0 items-center gap-2 px-3 text-xs" onClick={onSelect}><span className="relative flex size-4 shrink-0 items-center justify-center">{running && <span role="status" aria-label="작업 진행 중" className="absolute inset-0 animate-spin rounded-full border border-muted border-t-transparent motion-reduce:animate-none" />}<img src={claudeLogo} alt="Claude" className={running ? 'size-2' : 'size-3'} /></span><span className="max-w-40 truncate">{label}</span></button></Tooltip>
    <Tooltip content="탭 닫기" placement="bottom-end"><button type="button" aria-label="채팅 탭 닫기" disabled={pending} className="mr-1 flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-foreground" onClick={onClose}><svg aria-hidden="true" className="size-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></Tooltip>
  </div></Dropdown>{renaming && <RenameTab title={label} onClose={() => setRenaming(false)} onSave={value => { setCustomTitle(value); setRenaming(false); }} />}</>;
}
