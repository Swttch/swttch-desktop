import { t, useShellTranslation } from './i18n';
import type { AccountListItem } from '../../../../webview/src/shared/account';
import type { ProviderUsage } from './provider-usage';
import { AccountBattery } from './AccountBattery';
import { RefreshButton } from './RefreshButton';
import claudeLogo from './assets/claude-logo.svg';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AccountAvatar, AccountIdentity, ActiveAccountMark } from './AccountIdentity';
import { desktopApi } from './api';
import { QUERY_KEY, queryClient } from './query-client';
import { PATH } from './routes';
import { Dropdown } from './Dropdown';
import { Tooltip } from './Tooltip';


function AccountView({ path, onClose }: { path: string; onClose: () => void }) { useShellTranslation();
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
  return <dialog ref={dialog} aria-label={path === PATH.ACCOUNT_LOGIN ? t("Add account") : t("Manage accounts")} className="fixed inset-0 m-auto! flex h-[min(48rem,calc(100dvh-3rem))] w-[min(60rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border border-divider bg-canvas text-foreground backdrop:bg-black/60" onCancel={onClose}>
    <div className="flex shrink-0 items-center justify-between border-b border-divider px-4 py-2"><h2 className="text-sm font-medium">{path === PATH.ACCOUNT_LOGIN ? t("Add account") : t("Manage accounts")}</h2><button type="button" aria-label={t("Close accounts")} className="icon-button" onClick={onClose}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
    {view.error ? <div className="p-6 text-sm"><p role="alert">{view.error.message}</p><button className="secondary-button mt-4" onClick={() => { setLoaded(false); view.mutate(path); }}>{t("Try again")}</button></div> : <div className="relative min-h-0 flex-1">{view.data && <iframe title={path === PATH.ACCOUNT_LOGIN ? t("Add Claude account") : t("Manage Claude accounts")} className="block size-full border-0" src={view.data.url} onLoad={() => setLoaded(true)} />}{!loaded && <p role="status" className="absolute inset-0 grid place-items-center bg-canvas text-sm text-muted">{t("Loading accounts.")}</p>}</div>}
  </dialog>;
}

export function AccountSwitcher({ connected, usageAccounts, usagePending, usageError, onRefreshUsage }: { connected: boolean; usageAccounts: (AccountListItem & ProviderUsage)[]; usagePending: boolean; usageError?: string; onRefreshUsage: () => void }) { useShellTranslation();
  const [viewPath, setViewPath] = useState<string | null>(null);
  const closeDropdown = useRef<(() => void) | null>(null);
  const query = useQuery({ queryKey: QUERY_KEY.accounts, queryFn: ({ signal }) => desktopApi.accounts(signal), enabled: connected });
  const switchAccount = useMutation({ mutationFn: async (id: string) => {
    const result = await desktopApi.switchAccount(id);
    if (!result.accounts.some(account => account.id === id && account.active)) throw new Error(t("The selected account was not activated."));
    return result;
  }, onSuccess: async data => {
    queryClient.setQueryData(QUERY_KEY.accounts, data);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY.accountUsage }, { cancelRefetch: false });
    closeDropdown.current?.();
  } });
  const accounts = query.data?.accounts || [];
  const active = accounts.find(account => account.active);
  function show(path: string) { closeDropdown.current?.(); setViewPath(path); }
  const content = <section id="account-switcher" aria-label={t("Saved accounts")} className="w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-divider bg-navigation text-sm text-foreground">
      <div className="flex items-center justify-between px-3 pb-1 pt-2"><div className="flex items-center gap-2"><img src={claudeLogo} alt="" className="size-3 opacity-70" /><span className="text-xs font-medium text-muted">Claude</span></div><RefreshButton small label={t("Refresh usage for all accounts")} pending={usagePending} onClick={onRefreshUsage} /></div>
      {usageError && <p role="alert" className="px-3 py-2 text-xs text-muted">{usageError}</p>}
      {(query.error || switchAccount.error) && <p role="alert" className="px-3 py-2 text-xs text-muted">{switchAccount.error?.message || query.error?.message}</p>}
      {query.isPending && <p role="status" className="px-3 py-2 text-xs text-muted">{t("Loading accounts.")}</p>}
      {!query.isPending && !query.error && accounts.length === 0 && <p className="px-3 py-2 text-xs text-muted">{t("No saved accounts.")}</p>}
      <div className="max-h-[min(18rem,45dvh)] overflow-y-auto py-1">{accounts.map(account => {
        const usage = usageAccounts.find(item => item.id === account.id);
        const warning = [usage?.errors.usage?.message, usage?.errors.profile?.message, usage?.usageStale && `${t('Last successful check')}: ${new Date(usage.checkedAt).toLocaleString()}`].filter(Boolean).join(' · ');
        return <button key={account.id} type="button" aria-disabled={account.active || switchAccount.isPending} className={`flex w-full items-center gap-2 px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-foreground ${account.active || switchAccount.isPending ? 'cursor-default' : 'hover:bg-selected'}`} onClick={() => { if (!account.active && !switchAccount.isPending) switchAccount.mutate(account.id); }}>
          <AccountIdentity account={account} />
          {warning && <Tooltip content={warning} placement="top-end"><span aria-label={t("Usage lookup warning")} className="flex shrink-0 items-center text-amber-400/80"><svg aria-hidden="true" className="size-3 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v3.75m0 3h.008v.008H12v-.008ZM10.34 3.94 2.08 18.25A1.92 1.92 0 0 0 3.74 21h16.52a1.92 1.92 0 0 0 1.66-2.75L13.66 3.94a1.92 1.92 0 0 0-3.32 0Z" /></svg></span></Tooltip>}
          <AccountBattery window={usage?.usage?.five_hour} focusable={false} compact />
          {account.active ? <ActiveAccountMark /> : switchAccount.isPending && switchAccount.variables === account.id ? <span role="status" aria-label={t("Switching account")} className="size-4 animate-spin rounded-full border border-muted border-t-foreground motion-reduce:animate-none" /> : <span className="size-4 shrink-0" />}
        </button>;

      })}</div>
      <div className="border-t border-divider py-1"><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-start text-[0.8461rem] text-muted hover:bg-selected hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground" onClick={() => show(PATH.ACCOUNT_LOGIN)}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><path d="M12 5v14M5 12h14" /></svg>{t("Add account")}</button><button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-start text-[0.8461rem] text-muted hover:bg-selected hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground" onClick={() => show(PATH.ACCOUNT_SETTINGS)}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.6"><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>{t("Manage accounts")}</button></div>
    </section>;
  return <>
    <Dropdown content={content} closeRef={closeDropdown} onOpen={() => { switchAccount.reset(); void query.refetch(); }}><Tooltip content={t("Switch Claude account")} placement="top-start"><button type="button" className="icon-button size-6" aria-label={t("Switch Claude account")} aria-expanded="false" aria-controls="account-switcher" disabled={!connected}><AccountAvatar account={active} /></button></Tooltip></Dropdown>

    {viewPath && <AccountView path={viewPath} onClose={() => { setViewPath(null); void query.refetch(); }} />}
  </>;
}
