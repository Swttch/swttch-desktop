import { useEffect, useRef, useState } from 'react';
import claudeLogo from './assets/claude-logo.svg';
import { Tooltip } from './Tooltip';
import { Dropdown } from './Dropdown';
import type { DesktopTabAction } from './tab-action';

function MenuIcon({ name }: { name: string }) {
  return <svg aria-hidden="true" className="size-4 shrink-0 fill-none stroke-current text-muted" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {name === 'scheduled-messages' && <><path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></>}
    {name === 'background-tasks' && <><path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></>}
    {name === 'tunnel' && <><path d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></>}
    {name === 'assets' && <><path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></>}
    {name === 'rename' && <><path d="m5 16 1-4L16 2l4 4L10 16l-5 1Z" /><path d="M14 4l4 4M4 21h16" /></>}
    {name === 'restore' && <><path d="M3 10V4m0 6h6" /><path d="M4 8a8 8 0 1 1 0 8" /></>}
    {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
    {name === 'close-others' && <><rect x="3" y="6" width="13" height="14" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v11M7 10l5 6M12 10l-5 6" /></>}
    {name === 'close-right' && <><path d="M3 4v16M7 12h13m-4-4 4 4-4 4" /></>}
    {name === 'split-columns' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18" /></>}
    {name === 'split-rows' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18" /></>}
  </svg>;
}

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
    <button role="menuitem" className="project-menu-item flex items-center gap-2" onClick={() => activate(() => setRenaming(true))}><MenuIcon name="rename" />이름 변경</button>
    {customTitle && <button role="menuitem" className="project-menu-item flex items-center gap-2" onClick={() => activate(() => setCustomTitle(''))}><MenuIcon name="restore" />자동 이름으로 복원</button>}
    <div className="my-1 border-t border-divider" />
    {([{ id: 'scheduled-messages', label: '예약된 메시지' }, { id: 'background-tasks', label: '백그라운드 작업' }, { id: 'tunnel', label: '원격 터널' }, { id: 'assets', label: '에셋' }] as const).map(item => <button key={item.id} role="menuitem" disabled={pending} className="project-menu-item flex items-center gap-2" onClick={() => activate(() => onAction(item.id))}><MenuIcon name={item.id} />{item.label}</button>)}
    <div className="my-1 border-t border-divider" /><button role="menuitem" disabled={pending} className="project-menu-item flex items-center gap-2" onClick={() => activate(onClose)}><MenuIcon name="close" />탭 닫기</button>
    {([{ id: 'close-others', label: '다른 탭 닫기' }, { id: 'close-right', label: '오른쪽 탭 닫기' }] as const).map(item => <button key={item.id} role="menuitem" disabled className="project-menu-item flex items-center gap-2"><MenuIcon name={item.id} />{item.label}</button>)}
    <div className="my-1 border-t border-divider" />
    {([{ id: 'split-columns', label: '좌우 분할로 열기' }, { id: 'split-rows', label: '상하 분할로 열기' }] as const).map(item => <button key={item.id} role="menuitem" disabled className="project-menu-item flex items-center gap-2"><MenuIcon name={item.id} />{item.label}</button>)}
  </section>;
  return <><Dropdown contextMenu content={menu} closeRef={closeMenu}><div className={`workspace-tab group flex h-full min-w-0 max-w-60 shrink-0 items-center border-r border-divider border-b-2 ${selected ? 'border-b-muted bg-selected' : 'border-b-transparent hover:bg-hover'}`}>
    <Tooltip content={running ? `${label} · 진행 중` : label} placement="bottom-start"><button id="current-chat-tab" type="button" role="tab" aria-selected={selected} aria-controls="viewport" className="flex h-full min-w-0 items-center gap-2 px-3 text-xs" onClick={onSelect}><span className="relative flex size-4 shrink-0 items-center justify-center">{running && <span role="status" aria-label="작업 진행 중" className="absolute inset-0 animate-spin rounded-full border border-muted border-t-transparent motion-reduce:animate-none" />}<img src={claudeLogo} alt="Claude" className={running ? 'size-2' : 'size-3'} /></span><span className="max-w-40 truncate">{label}</span></button></Tooltip>
    <Tooltip content="탭 닫기" placement="bottom-end"><button type="button" aria-label="채팅 탭 닫기" disabled={pending} className="mr-1 flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-foreground" onClick={onClose}><svg aria-hidden="true" className="size-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></Tooltip>
  </div></Dropdown>{renaming && <RenameTab title={label} onClose={() => setRenaming(false)} onSave={value => { setCustomTitle(value); setRenaming(false); }} />}</>;
}
