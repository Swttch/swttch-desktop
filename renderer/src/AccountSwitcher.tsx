import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AccountListItem } from '../../../../webview/src/shared/account';
import { desktopApi } from './api';
import { QUERY_KEY, queryClient } from './query-client';
import { PATH } from './routes';
import { Tooltip } from './Tooltip';

function Avatar({ account, row = false }: { account?: AccountListItem; row?: boolean }) {
  const name = account?.displayName || account?.emailAddress || '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
  let hash = 0;
  for (const char of account?.id || '') hash = (Math.imul(31, hash) + char.charCodeAt(0)) | 0;
  // Preserve the plugin's Tailwind 3 palette across the desktop's Tailwind 4.
  const palette = ['#fb7185', '#ea580c', '#d97706', '#14b8a6', '#0ea5e9', '#a78bfa', '#f472b6', '#059669'];
  const color = account ? palette[Math.abs(hash) % palette.length] : undefined;
  return <span aria-hidden="true" style={{ backgroundColor: color }} className={`grid ${row ? 'size-6 text-[0.6153rem]' : 'size-5 text-[0.6153rem]'} shrink-0 place-items-center rounded-full ${account ? '' : 'bg-selected'} font-semibold uppercase leading-none text-white`}>{initials || <svg className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><circle cx="12" cy="8" r="3" /><path d="M5 21v-3a7 7 0 0 1 14 0v3" /></svg>}</span>;
}

function relativeTime(updatedAt: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - updatedAt) / 60_000));
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}일 전`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}시간 전`;
  return minutes > 0 ? `${minutes}분 전` : '방금';
}

function AccountView({ path, onClose }: { path: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const view = useMutation({ mutationFn: desktopApi.accountView });
  const requested = useRef(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    if (!requested.current) { requested.current = true; view.mutate(path); }
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} aria-label={path === PATH.ACCOUNT_LOGIN ? '계정 추가' : '계정 관리'} className="fixed inset-0 m-auto! flex h-[min(48rem,calc(100dvh-3rem))] w-[min(60rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border border-divider bg-canvas text-foreground backdrop:bg-black/60" onCancel={onClose}>
    <div className="flex shrink-0 items-center justify-between border-b border-divider px-4 py-2"><h2 className="text-sm font-medium">{path === PATH.ACCOUNT_LOGIN ? '계정 추가' : '계정 관리'}</h2><button type="button" aria-label="계정 화면 닫기" className="icon-button" onClick={onClose}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
    {view.error ? <div className="p-6 text-sm"><p role="alert">{view.error.message}</p><button className="secondary-button mt-4" onClick={() => { setLoaded(false); view.mutate(path); }}>다시 시도</button></div> : <div className="relative min-h-0 flex-1">{view.data && <iframe title={path === PATH.ACCOUNT_LOGIN ? 'Claude 계정 추가' : 'Claude 계정 관리'} className="block size-full border-0" src={view.data.url} onLoad={() => setLoaded(true)} />}{!loaded && <p role="status" className="absolute inset-0 grid place-items-center bg-canvas text-sm text-muted">계정 화면을 불러오고 있습니다.</p>}</div>}
  </dialog>;
}

export function AccountSwitcher({ connected, onOpen }: { connected: boolean; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [viewPath, setViewPath] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const query = useQuery({ queryKey: QUERY_KEY.accounts, queryFn: ({ signal }) => desktopApi.accounts(signal), enabled: connected });
  const switchAccount = useMutation({ mutationFn: async (id: string) => {
    const result = await desktopApi.switchAccount(id);
    if (!result.accounts.some(account => account.id === id && account.active)) throw new Error('선택한 계정이 활성화되지 않았습니다.');
    return result;
  }, onSuccess: async data => {
    queryClient.setQueryData(QUERY_KEY.accounts, data);
    await queryClient.resetQueries({ queryKey: QUERY_KEY.providerUsage });
    setOpen(false);
  } });
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const accounts = query.data?.accounts || [];
  const active = accounts.find(account => account.active);
  function show(path: string) { setOpen(false); setViewPath(path); }
  return <div ref={root} className="relative">
    <Tooltip content="Claude 계정 전환" placement="top-start"><button ref={trigger} type="button" className="icon-button size-6" aria-label="Claude 계정 전환" aria-expanded={open} aria-controls="account-switcher" disabled={!connected} onClick={() => { if (!open) { onOpen(); switchAccount.reset(); void query.refetch(); } setOpen(!open); }}><Avatar account={active} /></button></Tooltip>
    {open && <section id="account-switcher" aria-label="저장 계정 목록" className="fixed bottom-[calc(2rem+0.5rem)] left-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-divider bg-navigation text-sm text-foreground">
      {(query.error || switchAccount.error) && <p role="alert" className="px-3 py-2 text-xs text-muted">{switchAccount.error?.message || query.error?.message}</p>}
      {query.isPending && <p role="status" className="px-3 py-2 text-xs text-muted">계정을 불러오고 있습니다.</p>}
      {!query.isPending && !query.error && accounts.length === 0 && <p className="px-3 py-2 text-xs text-muted">저장된 계정이 없습니다.</p>}
      <div className="max-h-[min(18rem,45dvh)] overflow-y-auto py-1">{accounts.map(account => <button key={account.id} type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground disabled:cursor-default disabled:opacity-100 disabled:hover:bg-transparent" disabled={account.active || switchAccount.isPending} onClick={() => switchAccount.mutate(account.id)}><Avatar account={account} row /><span className="min-w-0 flex-1"><span className="block truncate text-[0.8461rem] font-semibold leading-tight">{account.displayName || account.emailAddress}</span>{account.displayName && <span className="block truncate text-[0.7077rem] text-muted">{account.emailAddress}</span>}</span>{account.active ? <svg aria-label="현재 계정" className="size-4 shrink-0 fill-none stroke-[#22c55e]" viewBox="0 0 24 24" strokeWidth="1.6"><path d="m4.5 12.75 6 6 9-13.5" /></svg> : switchAccount.isPending && switchAccount.variables === account.id ? <span role="status" aria-label="계정 전환 중" className="size-3 animate-spin rounded-full border border-muted border-t-foreground motion-reduce:animate-none" /> : <span className="shrink-0 whitespace-nowrap text-[0.7077rem] text-muted">{relativeTime(account.updatedAt)}</span>}</button>)}</div>
      <div className="border-t border-divider py-1"><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8461rem] text-muted hover:bg-selected hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground" onClick={() => show(PATH.ACCOUNT_LOGIN)}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><path d="M12 5v14M5 12h14" /></svg>계정 추가</button><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8461rem] text-muted hover:bg-selected hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground" onClick={() => show(PATH.ACCOUNT_SETTINGS)}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>계정 관리</button></div>
    </section>}
    {viewPath && <AccountView path={viewPath} onClose={() => { setViewPath(null); void query.refetch(); }} />}
  </div>;
}
