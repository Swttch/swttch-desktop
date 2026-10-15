import { t, useShellTranslation } from './i18n';
import type { PanelDropEdge } from '../../src/workspace-layout.mjs';
import { useMutation, useQuery } from '@tanstack/react-query';
import { desktopApi } from './api';
import { QUERY_KEY, queryClient } from './query-client';
import toast from 'react-hot-toast';
import { shortcutLabel, type DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from './shortcut-platform';
import { useEffect, useRef, useState } from 'react';
import claudeLogo from './assets/claude-logo.svg';
import { Tooltip } from './Tooltip';
import { Dropdown } from './Dropdown';
import type { DesktopTabAction } from './tab-action';

function MenuIcon({ name }: { name: string }) { useShellTranslation();
  return <svg aria-hidden="true" className="size-4 shrink-0 fill-none stroke-current text-muted" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {name === 'scheduled-messages' && <><path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></>}
    {name === 'background-tasks' && <><path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></>}
    {name === 'tunnel' && <><path d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" /></>}
    {name === 'assets' && <><path d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></>}
    {name === 'favorite' && <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />}
    {name === 'rename' && <><path d="m5 16 1-4L16 2l4 4L10 16l-5 1Z" /><path d="M14 4l4 4M4 21h16" /></>}
    {name === 'refresh' && <path d="M20 4v6h-6m5-3a8 8 0 1 0 1 9" />}
    {name === 'restore' && <><path d="M3 10V4m0 6h6" /><path d="M4 8a8 8 0 1 1 0 8" /></>}
    {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
    {name === 'close-others' && <><rect x="3" y="6" width="13" height="14" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v11M7 10l5 6M12 10l-5 6" /></>}
    {name === 'close-right' && <><path d="M3 4v16M7 12h13m-4-4 4 4-4 4" /></>}
    {name === 'split-columns' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M12 3v18" /></>}
    {name === 'split-rows' && <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 12h18" /></>}
  </svg>;
}

function RenameTab({ title, pending, error, onSave, onClose }: { title: string; pending: boolean; error?: string; onSave: (value: string) => void; onClose: () => void }) { useShellTranslation();
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(title);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-label={t("Rename tab")} onCancel={event => { event.preventDefault(); if (!pending) onClose(); }} className="fixed inset-0 m-auto! w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-divider bg-navigation p-4 text-foreground backdrop:bg-black/50"><form onSubmit={event => { event.preventDefault(); if (!pending && value.trim()) onSave(value.trim()); }}><h2 className="mb-3 text-sm font-medium">{t("Rename tab")}</h2><input autoFocus aria-label={t("Tab name")} value={value} disabled={pending} maxLength={512} onChange={event => setValue(event.target.value)} className="field w-full" /><p role="alert" className="mt-2 text-xs text-red-400">{error}</p><div className="mt-4 flex justify-end gap-2"><button type="button" disabled={pending} className="secondary-button" onClick={onClose}>{t("Cancel")}</button><button type="submit" disabled={pending || !value.trim()} className="primary-button">{pending ? t("Saving…") : t("Save")}</button></div></form></dialog>;
}

export function WorkspaceTab({ tabId = 'current-chat', projectId, sessionId, terminal = false, renameRequested, favoriteRequested, onRequestHandled, title, customName, onRename, selected, pending, running, onSelect, onClose, onAction, onCloseOthers, canCloseOthers = false, onCloseRight, canCloseRight = false, onRefresh, onMoveEdge, canMoveEdge, onSplit }: { tabId?: string; terminal?: boolean; projectId: number; sessionId: string; renameRequested: boolean; favoriteRequested: boolean; onRequestHandled: (kind: 'rename' | 'favorite') => void; title: string; customName?: string; onRename?: (value: string) => void; selected: boolean; pending: boolean; running: boolean; onSelect: () => void; onClose: () => void; onAction: (action: DesktopTabAction) => void; onCloseOthers?: () => void; canCloseOthers?: boolean; onCloseRight?: () => void; canCloseRight?: boolean; onRefresh: () => void; onMoveEdge: (edge: PanelDropEdge) => void; canMoveEdge: boolean; onSplit?: (direction: 'columns' | 'rows') => void }) { useShellTranslation();
  const [localCustomTitle, setLocalCustomTitle] = useState('');
  const customTitle = customName === undefined ? localCustomTitle : customName;
  const setCustomTitle = (value: string) => { if (onRename) onRename(value); else setLocalCustomTitle(value); };
  const [renaming, setRenaming] = useState(false);
  const closeMenu = useRef<(() => void) | null>(null);
  const sessionKey = [...QUERY_KEY.session, projectId, sessionId];
  const session = useQuery({ queryKey: sessionKey, queryFn: ({ signal }) => desktopApi.session(String(projectId), sessionId, signal), enabled: !!sessionId });
  const label = session.data?.session.title || customTitle || title;
  const rename = useMutation({ scope: { id: `rename-${projectId}-${sessionId}` }, mutationFn: (value: string) => desktopApi.renameSession(String(projectId), sessionId, value), onSuccess: async () => {
    setCustomTitle('');
    await queryClient.invalidateQueries({ queryKey: sessionKey });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessionLists });
    setRenaming(false);
  } });
  const openRename = () => { rename.reset(); setRenaming(true); };
  const favorited = !!session.data?.session.favoritedAt;
  const favorite = useMutation({ scope: { id: `favorite-${projectId}-${sessionId}` }, mutationFn: async () => {
    if (!sessionId) throw new Error(t("Send the first message before adding this chat to favorites."));
    const latest = await queryClient.fetchQuery({ queryKey: sessionKey, queryFn: ({ signal }) => desktopApi.session(String(projectId), sessionId, signal) });
    return desktopApi.favoriteSession(String(projectId), sessionId, !latest.session.favoritedAt);
  }, onSuccess: data => { queryClient.setQueryData(sessionKey, data); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessionLists }); }, onError: error => toast.error(error.message) });
  useEffect(() => { if (renameRequested) { closeMenu.current?.(); openRename(); onRequestHandled('rename'); } }, [renameRequested]);
  useEffect(() => { if (favoriteRequested) { closeMenu.current?.(); favorite.mutate(); onRequestHandled('favorite'); } }, [favoriteRequested]);
  const keyHint = (command: DesktopCommand) => <kbd aria-hidden="true" className="shortcut-keys ms-auto shrink-0">{shortcutLabel(command, macShortcuts, browserShortcuts)}</kbd>;

  const activate = (action: () => void) => { closeMenu.current?.(); action(); };
  const menu = <section role="menu" aria-label={t("Tab menu")} className="w-64 rounded-lg border border-divider bg-navigation p-1 text-sm text-foreground" onKeyDown={event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }}>
    <button role="menuitem" className="project-menu-item flex items-center gap-2" onClick={() => activate(openRename)}><MenuIcon name="rename" />{t("Rename")}{keyHint('rename')}</button>
    <button role="menuitem" disabled={pending || favorite.isPending || !sessionId} className="project-menu-item flex items-center gap-2" onClick={() => activate(() => favorite.mutate())}><span className={favorited ? 'text-yellow-400' : 'text-muted'}><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 stroke-current" fill={favorited ? 'currentColor' : 'none'} strokeWidth="1.5"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></svg></span>{favorited ? t("Remove from favorites") : t("Favorite")}{keyHint('favorite')}</button>
    {!sessionId && customTitle && <button role="menuitem" className="project-menu-item flex items-center gap-2" onClick={() => activate(() => setCustomTitle(''))}><MenuIcon name="restore" />{t("Restore automatic name")}</button>}
    <div className="my-1 border-t border-divider" />
    {([{ id: 'scheduled-messages', label: t("Scheduled messages") }, { id: 'background-tasks', label: t("Background tasks") }, { id: 'tunnel', label: t("Remote tunnel") }, { id: 'assets', label: t("Assets") }] as const).map(item => <button key={item.id} role="menuitem" disabled={pending || terminal} className="project-menu-item flex items-center gap-2" onClick={() => activate(() => onAction(item.id))}><MenuIcon name={item.id} />{item.label}</button>)}
    <div className="my-1 border-t border-divider" /><button role="menuitem" disabled={pending} className="project-menu-item flex items-center gap-2" onClick={() => activate(onRefresh)}><MenuIcon name="refresh" />{t("Refresh tab")}{keyHint('refresh')}</button><button role="menuitem" disabled={pending} className="project-menu-item flex items-center gap-2" onClick={() => activate(onClose)}><MenuIcon name="close" />{t("Close tab")}{keyHint('close')}</button>
    {([{ id: 'close-others', label: t("Close other tabs") }, { id: 'close-right', label: t("Close tabs to the right") }] as const).map(item => <button key={item.id} role="menuitem" disabled={pending || (item.id === 'close-others' ? !canCloseOthers : !canCloseRight)} className="project-menu-item flex items-center gap-2" onClick={() => activate(() => item.id === 'close-others' ? onCloseOthers?.() : onCloseRight?.())}><MenuIcon name={item.id} />{item.label}</button>)}
    <div className="my-1 border-t border-divider" />
    {([{ id: 'split-columns', label: t("Split horizontally") }, { id: 'split-rows', label: t("Split vertically") }] as const).map(item => <button key={item.id} role="menuitem" disabled={pending || !onSplit} className="project-menu-item flex items-center gap-2" onClick={() => activate(() => onSplit?.(item.id === 'split-columns' ? 'columns' : 'rows'))}><MenuIcon name={item.id} />{item.label}{keyHint(item.id)}</button>)}
    <div className="my-1 border-t border-divider" />
    {([{ edge: 'left', command: 'move-left', label: t("Move to a new panel on the left") }, { edge: 'right', command: 'move-right', label: t("Move to a new panel on the right") }, { edge: 'top', command: 'move-up', label: t("Move to a new panel above") }, { edge: 'bottom', command: 'move-down', label: t("Move to a new panel below") }] as const).map(item => <button key={item.edge} role="menuitem" disabled={pending || !canMoveEdge} className="project-menu-item flex items-center gap-2" onClick={() => activate(() => onMoveEdge(item.edge))}><MenuIcon name={['left', 'right'].includes(item.edge) ? 'split-columns' : 'split-rows'} />{item.label}{keyHint(item.command)}</button>)}
  </section>;
  return <><Dropdown contextMenu content={menu} closeRef={closeMenu}><div className={`workspace-tab group flex h-full min-w-0 max-w-60 shrink-0 items-center border-r border-divider border-b-2 ${selected ? 'border-b-muted bg-selected' : 'border-b-transparent hover:bg-hover'}`}>
    <Tooltip content={running ? `${label} · ${t("Work in progress")}` : label} placement="bottom-start"><button id={`workspace-tab-${tabId}`} type="button" role="tab" aria-selected={selected} aria-controls={`viewport-${tabId}`} className="flex h-full min-w-0 items-center gap-2 px-3 text-xs" onClick={onSelect}><span className="relative flex size-4 shrink-0 items-center justify-center">{running && <span role="status" aria-label={t("Work in progress")} className="absolute inset-0 animate-spin rounded-full border border-muted border-t-transparent motion-reduce:animate-none" />}<>{terminal ? <svg aria-label={t("Terminal")} className="size-3.5 fill-none stroke-current text-muted" viewBox="0 0 24 24" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m6 0h4" /></svg> : <img src={claudeLogo} alt="Claude" className={running ? 'size-2' : 'size-3'} />}</></span><span className="max-w-40 truncate">{label}</span></button></Tooltip>
    <Tooltip content={t("Close tab")} placement="bottom-end"><button type="button" aria-label={terminal ? t("Close terminal tab") : t("Close chat tab")} disabled={pending} className="me-1 flex size-5 shrink-0 items-center justify-center rounded text-muted hover:bg-hover hover:text-foreground" onClick={onClose}><svg aria-hidden="true" className="size-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button></Tooltip>
  </div></Dropdown>{renaming && <RenameTab title={label} pending={rename.isPending} error={rename.error?.message} onClose={() => setRenaming(false)} onSave={value => { if (sessionId) rename.mutate(value); else { setCustomTitle(value); setRenaming(false); } }} />}</>;
}
