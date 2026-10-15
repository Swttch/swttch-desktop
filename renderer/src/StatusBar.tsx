import { t, useShellTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { UsageBucket } from '@swttch/extend-kit/battery';
import { desktopApi } from './api';
import { DesktopPhase, type DesktopState } from './desktop';
import { QUERY_KEY, queryClient } from './query-client';
import { Tooltip } from './Tooltip';
import claudeLogo from './assets/claude-logo.svg';
import { AccountSwitcher } from './AccountSwitcher';
import { Dropdown } from './Dropdown';
import { RefreshButton } from './RefreshButton';
import { UsageReportSection } from './UsageReportSection';
import { StatusClock } from './StatusClock';
import { AccountIdentity, ActiveAccountMark } from './AccountIdentity';

const percent = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
const batteryColor = (remaining: number | null) => remaining === null ? undefined : remaining > 50 ? '#22c55e' : remaining >= 20 ? '#eab308' : '#ef4444';
const resetTime = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : t("No reset time");
const labels: Record<string, string> = { five_hour: "Session (5 hours)", seven_day: "Weekly (7 days)", seven_day_opus: "Weekly Opus", seven_day_sonnet: "Weekly Sonnet", seven_day_oauth_apps: "Weekly OAuth apps", seven_day_cowork: "Weekly Cowork" };


export function StatusBar({ state }: { state: DesktopState }) { useShellTranslation();
  const [usageOpen, setUsageOpen] = useState(false);
  const accountsRevision = useRef(state.accountsRevision);
  accountsRevision.current = state.accountsRevision;
  const ready = state.phase === DesktopPhase.Ready || state.phase === DesktopPhase.Chat;
  const query = useQuery({ queryKey: QUERY_KEY.accountUsage, queryFn: ({ signal }) => desktopApi.accountUsage(signal), enabled: ready, staleTime: 60_000, refetchInterval: 60_000 });
  const accountsQuery = useQuery({ queryKey: QUERY_KEY.accounts, queryFn: ({ signal }) => desktopApi.accounts(signal), enabled: ready });
  const refresh = useMutation({ mutationFn: async () => {
    const revision = accountsRevision.current;
    return { revision, data: await desktopApi.refreshAccountUsage() };
  }, onSuccess: result => {
    if (result.revision === accountsRevision.current) queryClient.setQueryData(QUERY_KEY.accountUsage, result.data);
  } });
  const reconnect = useMutation({ mutationFn: desktopApi.retry, onSuccess: data => queryClient.setQueryData(QUERY_KEY.workspace, data) });
  const previousRevision = useRef(state.accountsRevision);
  useEffect(() => {
    if (state.accountsRevision === undefined || state.accountsRevision === previousRevision.current) return;
    previousRevision.current = state.accountsRevision;
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.accounts });
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY.accountUsage }, { cancelRefetch: false });
  }, [state.accountsRevision]);
  const activeId = accountsQuery.data?.accounts.find(account => account.active)?.id;
  const allAccounts = (query.data?.accounts || []).map(account => ({ ...account, active: activeId ? account.id === activeId : account.active }));
  const data = allAccounts.find(account => account.active);
  const usage = data?.usage;
  const usageCheckedAt = data?.checkedAt;
  const account = data?.profile?.account;
  const authMethod = data?.authMethod;
  const authLabel = authMethod ? ({ claudeai: 'Claude AI', console: 'Anthropic Console', apikey: 'API Key', 'api-key': 'API Key', '3p': 'Third Party' } as Record<string, string>)[authMethod.replace(/\./g, '').toLowerCase()] || authMethod : '—';
  const plan = data?.subscriptionType || (account?.has_claude_max ? 'max' : account?.has_claude_pro ? 'pro' : data?.profile?.organization.organization_type);
  const planLabel = plan ? plan.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : '—';

  const windows = usage ? Object.entries(usage).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object' || !('utilization' in value) || typeof value.utilization !== 'number' || !Number.isFinite(value.utilization) || !('resets_at' in value)) return [];
    return [{ label: t(labels[key] || key), value: value as UsageBucket }];
  }) : [];
  const namedLimits = usage?.limits?.filter(limit => {
    if (!Number.isFinite(limit.percent)) return false;
    // The provider also describes the standard windows in limits. Keep the
    // original response intact and avoid showing those windows twice here.
    const duplicate = limit.kind === 'session' ? usage.five_hour : limit.kind === 'weekly_all' ? usage.seven_day : null;
    return !duplicate || duplicate.utilization !== limit.percent || duplicate.resets_at !== limit.resets_at;
  }) || [];

  const connectionLabel = ready ? t("Connected locally") : state.phase === DesktopPhase.Error ? t("Disconnected") : t("Connecting");
  const compact = [usage?.five_hour && `${percent(usage.five_hour.utilization)}% 5h`, usage?.seven_day && `${percent(usage.seven_day.utilization)}% wk`].filter(Boolean).join(' · ');
  const remaining = usage?.five_hour ? 100 - percent(usage.five_hour.utilization) : null;
  const error = refresh.error?.message || query.error?.message;
  const usageContent = <section id="provider-usage-panel" aria-label={t("Claude account and usage details")} className="max-h-[min(36rem,75dvh)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-divider bg-navigation p-4 text-sm text-foreground">
      <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-1.5"><h2 className="font-medium">{t("Claude accounts and usage")}</h2><Tooltip content={t("Based on this computer's default Claude login, independently of per-session accounts and context usage.")} placement="top-start"><button type="button" aria-label={t("About account usage")} className="icon-button size-5"><svg aria-hidden="true" className="size-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.25 11.25h1.5V16.5M12 7.5h.008v.008H12V7.5Z" /><circle cx="12" cy="12" r="9" /></svg></button></Tooltip></div><RefreshButton pending={query.isFetching || refresh.isPending} onClick={() => refresh.mutate()} /></div>
      {query.isPending && <p role="status" className="mt-4">{t("Loading account information.")}</p>}
      {error && <p role="alert" className="mt-4 text-muted">{error}</p>}
      {data && <div className="mt-4"><div className="flex items-center gap-2"><AccountIdentity account={data} /><ActiveAccountMark /></div><dl className="mt-4 space-y-2.5"><div className="flex items-center justify-between gap-4"><dt className="text-muted">{t("Authentication method")}</dt><dd className="text-end">{authLabel}</dd></div><div className="flex items-center justify-between gap-4"><dt className="text-muted">{t("Plan")}</dt><dd className="text-end">{planLabel}</dd></div></dl></div>}
      {data?.errors.profile && <p role="status" className="mt-4 text-xs leading-5 text-muted">{data.errors.profile.message}</p>}
      {windows.map(({ label, value }) => <div key={label} className="mt-4"><div className="flex justify-between gap-3"><span>{label}</span><span className="tabular-nums">{percent(value.utilization)}%</span></div><div role="progressbar" aria-label={`${label} ${t("Usage")}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(value.utilization)} className="mt-2 h-1.5 overflow-hidden rounded bg-selected"><div className="h-full rounded bg-muted" style={{ width: `${percent(value.utilization)}%` }} /></div><p className="mt-1 text-xs text-muted">{resetTime(value.resets_at)}</p></div>)}
      {namedLimits.map((limit, index) => <div key={`${limit.kind}-${index}`} className="mt-4"><div className="flex justify-between gap-3"><span>{limit.scope?.model?.display_name || limit.kind}</span><span className="tabular-nums">{percent(limit.percent)}%</span></div><p className="mt-1 text-xs text-muted">{resetTime(limit.resets_at)}</p></div>)}
      {usage?.extra_usage && <dl className="mt-4"><div className="flex items-center justify-between gap-4"><dt className="text-muted">{t("Extra usage settings")}</dt><dd><button type="button" role="switch" aria-label={t("Extra usage settings")} aria-checked={usage.extra_usage.is_enabled} disabled className={`relative block h-4 w-7 rounded-full border ${usage.extra_usage.is_enabled ? 'border-[#22c55e] bg-[#22c55e]' : 'border-muted/40 bg-selected'}`}><span aria-hidden="true" className={`absolute top-0.5 size-2.5 rounded-full ${usage.extra_usage.is_enabled ? 'right-0.5 bg-white' : 'left-0.5 bg-muted'}`} /></button></dd></div>{typeof usage.extra_usage.utilization === 'number' && <div className="mt-2 flex items-center justify-between gap-4 text-xs"><dt className="text-muted">{t("Extra usage")}</dt><dd className="tabular-nums">{percent(usage.extra_usage.utilization)}%</dd></div>}</dl>}
      {usage && windows.length === 0 && namedLimits.length === 0 && <p className="mt-4 text-muted">{t("No quota information available.")}</p>}
      {(usageCheckedAt || data?.errors.usage) && <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
        <div className="flex items-center gap-1.5"><span>{t("Last checked")}{usageCheckedAt ? new Date(usageCheckedAt).toLocaleTimeString('ko-KR') : '—'}</span><Tooltip content={t("Refreshes every minute; waits when rate-limited")} placement="top-start"><button type="button" aria-label={t("Usage refresh interval")} className="icon-button size-5"><svg aria-hidden="true" className="size-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.25 11.25h1.5V16.5M12 7.5h.008v.008H12V7.5Z" /><circle cx="12" cy="12" r="9" /></svg></button></Tooltip></div>
        {data?.errors.usage && <Tooltip content={data.errors.usage.message} placement="top-end"><button type="button" aria-label={t("Usage lookup warning")} className="icon-button size-5 text-amber-400/80"><svg aria-hidden="true" className="size-3.5 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v3.75m0 3h.008v.008H12v-.008ZM10.34 3.94 2.08 18.25A1.92 1.92 0 0 0 3.74 21h16.52a1.92 1.92 0 0 0 1.66-2.75L13.66 3.94a1.92 1.92 0 0 0-3.32 0Z" /></svg></button></Tooltip>}
      </div>}

      <UsageReportSection enabled={usageOpen} project={state.project} accountsRevision={state.accountsRevision || 0} />
    </section>;
  const connectionContent = <section id="backend-connection-panel" aria-label={t("Backend connection details")} className="w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-divider bg-navigation p-4 text-sm text-foreground"><h2 className="font-medium">{t("CCG backend")}</h2><p role="status" className="mt-3">{connectionLabel}</p><p className="mt-2 text-xs leading-5 text-muted">{ready ? t("Connected to chat environment.") : state.message}</p>{state.phase === DesktopPhase.Error && <button type="button" className="secondary-button mt-4" disabled={reconnect.isPending} onClick={() => reconnect.mutate()}>{reconnect.isPending ? t("Connecting…") : t("Reconnect")}</button>}{reconnect.error && <p role="alert" className="mt-3 text-xs text-muted">{reconnect.error.message}</p>}</section>;
  return <footer className="relative flex h-8 shrink-0 items-center justify-between gap-3 border-t border-divider bg-navigation px-3 text-xs text-muted" aria-label={t("Status bar")}>
    <div className="flex min-w-0 items-center gap-1">
    <AccountSwitcher connected={ready} usageAccounts={allAccounts} usagePending={query.isFetching || refresh.isPending} usageError={error} onRefreshUsage={() => refresh.mutate()} />
    <span aria-hidden="true" className="mx-1 h-3 w-px shrink-0 bg-divider" />
    <Dropdown content={usageContent} onOpen={() => setUsageOpen(true)} onClose={() => setUsageOpen(false)}>
      <Tooltip content={t("Claude subscription usage")} placement="top-start">
      <button type="button" className="flex min-w-0 items-center gap-2 rounded px-2 py-1 hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground" aria-label={t("Claude accounts and usage")} aria-expanded="false" aria-controls="provider-usage-panel">
        <img src={claudeLogo} alt="" className="size-3.5 shrink-0" /><svg aria-hidden="true" viewBox="0 0 16 16" style={{ color: batteryColor(remaining) }} className={`size-5 shrink-0 ${remaining !== null && remaining < 20 ? 'animate-pulse motion-reduce:animate-none' : ''} ${query.isFetching ? 'opacity-50' : ''}`} fill="currentColor"><rect x="1" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" /><rect x="13" y="6.5" width="1.5" height="3" rx=".5" />{remaining !== null && <rect x="2.5" y="5.5" width={9 * remaining / 100} height="5" rx=".5" />}</svg><span className="tabular-nums" style={{ color: batteryColor(remaining) }} aria-label={t("Remaining 5-hour quota")}>{remaining === null ? "—" : `${remaining}%`}</span><span className="tabular-nums" style={{ color: batteryColor(remaining) }}>{query.isPending ? '…' : compact || '—'}</span>
      </button>
      </Tooltip>
    </Dropdown>
    <RefreshButton small pending={query.isFetching || refresh.isPending} onClick={() => refresh.mutate()} />
    </div>

    <div className="flex shrink-0 items-center gap-2">
    <Dropdown content={connectionContent}>
      <Tooltip content={t("CCG backend connection")} placement="top-end">
      <button type="button" className="flex shrink-0 items-center gap-2 rounded px-2 py-1 hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground" aria-expanded="false" aria-controls="backend-connection-panel"><span aria-hidden="true" className={`size-1.5 rounded-full ${ready ? 'bg-status' : 'bg-muted'}`} /><span>{connectionLabel}</span></button>
      </Tooltip>
    </Dropdown>
    <StatusClock />
    </div>
  </footer>;
}
