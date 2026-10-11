import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { UsageBucket } from '@swttch/extend-kit/battery';
import { desktopApi } from './api';
import { DesktopPhase, type DesktopState } from './desktop';
import { QUERY_KEY, queryClient } from './query-client';
import { Tooltip } from './Tooltip';
import claudeLogo from './assets/claude-logo.svg';

enum Panel { Account = 'account', Connection = 'connection' }
const percent = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
const batteryColor = (remaining: number | null) => remaining === null ? undefined : remaining > 50 ? '#22c55e' : remaining >= 20 ? '#eab308' : '#ef4444';
const resetTime = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '초기화 시각 없음';
const labels: Record<string, string> = { five_hour: '5h', seven_day: 'wk', seven_day_opus: 'Opus wk', seven_day_sonnet: 'Sonnet wk', seven_day_oauth_apps: 'OAuth wk', seven_day_cowork: 'Cowork wk' };

function RefreshButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return <Tooltip content="사용량 새로고침" placement="top-start"><button type="button" className="icon-button size-6" aria-label="사용량 새로고침" disabled={pending} onClick={onClick}><svg aria-hidden="true" viewBox="0 0 24 24" className={`size-4 fill-none stroke-current ${pending ? 'animate-spin motion-reduce:animate-none' : ''}`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg></button></Tooltip>;
}

export function StatusBar({ state }: { state: DesktopState }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const root = useRef<HTMLElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);
  const connectionButton = useRef<HTMLButtonElement>(null);
  const query = useQuery({ queryKey: QUERY_KEY.providerUsage, queryFn: ({ signal }) => desktopApi.providerUsage(signal), staleTime: 60_000, refetchInterval: 60_000 });
  const refresh = useMutation({ mutationFn: desktopApi.refreshProviderUsage, onSuccess: data => queryClient.setQueryData(QUERY_KEY.providerUsage, data) });
  const reconnect = useMutation({ mutationFn: desktopApi.retry, onSuccess: data => queryClient.setQueryData(QUERY_KEY.workspace, data) });
  useEffect(() => {
    if (!panel) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPanel(null);
      (panel === Panel.Account ? accountButton : connectionButton).current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    const blur = () => { if (document.activeElement instanceof HTMLIFrameElement) setPanel(null); };
    window.addEventListener('blur', blur);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('blur', blur); };
  }, [panel]);
  const data = query.data;
  const usage = data?.usage;
  const account = data?.profile?.account;
  const windows = usage ? Object.entries(usage).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object' || !('utilization' in value) || typeof value.utilization !== 'number' || !Number.isFinite(value.utilization) || !('resets_at' in value)) return [];
    return [{ label: labels[key] || key, value: value as UsageBucket }];
  }) : [];
  const namedLimits = usage?.limits?.filter(limit => {
    if (!Number.isFinite(limit.percent)) return false;
    // The provider also describes the standard windows in limits. Keep the
    // original response intact and avoid showing those windows twice here.
    const duplicate = limit.kind === 'session' ? usage.five_hour : limit.kind === 'weekly_all' ? usage.seven_day : null;
    return !duplicate || duplicate.utilization !== limit.percent || duplicate.resets_at !== limit.resets_at;
  }) || [];
  const ready = state.phase === DesktopPhase.Ready || state.phase === DesktopPhase.Chat;
  const connectionLabel = ready ? '로컬 연결됨' : state.phase === DesktopPhase.Error ? '연결 종료' : '연결 중';
  const compact = [usage?.five_hour && `${percent(usage.five_hour.utilization)}% 5h`, usage?.seven_day && `${percent(usage.seven_day.utilization)}% wk`].filter(Boolean).join(' · ');
  const remaining = usage?.five_hour ? 100 - percent(usage.five_hour.utilization) : null;
  const error = refresh.error?.message || query.error?.message;
  return <footer ref={root} className="relative flex h-8 shrink-0 items-center justify-between gap-3 border-t border-divider bg-navigation px-3 text-xs text-muted" aria-label="공통 상태바">
    <div className="flex min-w-0 items-center gap-1">
    <Tooltip content="Claude 구독 사용률 · 배터리 채움은 5h 잔여 한도" placement="top-start">
      <button ref={accountButton} type="button" className="flex min-w-0 items-center gap-2 rounded px-2 py-1 hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground" aria-label="Claude 계정 및 사용량" aria-expanded={panel === Panel.Account} aria-controls="provider-usage-panel" onClick={() => setPanel(panel === Panel.Account ? null : Panel.Account)}>
        <img src={claudeLogo} alt="" className="size-3.5 shrink-0" /><svg aria-hidden="true" viewBox="0 0 16 16" style={{ color: batteryColor(remaining) }} className={`size-5 shrink-0 ${remaining !== null && remaining < 20 ? 'animate-pulse motion-reduce:animate-none' : ''} ${query.isFetching ? 'opacity-50' : ''}`} fill="currentColor"><rect x="1" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" /><rect x="13" y="6.5" width="1.5" height="3" rx=".5" />{remaining !== null && <rect x="2.5" y="5.5" width={9 * remaining / 100} height="5" rx=".5" />}</svg><span className="tabular-nums" style={{ color: batteryColor(remaining) }}>{query.isPending ? '…' : compact || '—'}</span>
      </button>
    </Tooltip>
    <RefreshButton pending={query.isFetching || refresh.isPending} onClick={() => refresh.mutate()} />
    </div>
    {panel === Panel.Account && <section id="provider-usage-panel" aria-label="Claude 계정 및 사용량 상세" className="absolute bottom-full left-3 z-50 mb-2 max-h-[min(36rem,75dvh)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-divider bg-navigation p-4 text-sm text-foreground">
      <div className="flex items-center justify-between gap-4"><h2 className="font-medium">Claude 계정·사용량</h2><RefreshButton pending={query.isFetching || refresh.isPending} onClick={() => refresh.mutate()} /></div>
      <p className="mt-2 text-xs leading-5 text-muted">이 컴퓨터의 기본 Claude 로그인 기준입니다. 세션별 계정·컨텍스트 사용량과는 별개입니다.</p>
      {query.isPending && <p role="status" className="mt-4">계정 정보를 조회하고 있습니다.</p>}
      {error && <p role="alert" className="mt-4 text-muted">{error}</p>}
      {account && <div className="mt-4 break-words"><p>{account.display_name || account.full_name || 'Claude 계정'}</p><p className="mt-1 text-xs text-muted">{account.email}</p><p className="mt-1 text-xs text-muted">{account.has_claude_max ? 'Claude Max' : account.has_claude_pro ? 'Claude Pro' : data?.profile?.organization.organization_type}</p></div>}
      {data?.errors.profile && <p role="status" className="mt-4 text-xs leading-5 text-muted">{data.errors.profile.message}</p>}
      {windows.map(({ label, value }) => <div key={label} className="mt-4"><div className="flex justify-between gap-3"><span>{label}</span><span className="tabular-nums">{percent(value.utilization)}%</span></div><div role="progressbar" aria-label={`${label} 사용량`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(value.utilization)} className="mt-2 h-1.5 overflow-hidden rounded bg-selected"><div className="h-full rounded bg-muted" style={{ width: `${percent(value.utilization)}%` }} /></div><p className="mt-1 text-xs text-muted">{resetTime(value.resets_at)}</p></div>)}
      {namedLimits.map((limit, index) => <div key={`${limit.kind}-${index}`} className="mt-4"><div className="flex justify-between gap-3"><span>{limit.scope?.model?.display_name || limit.kind}</span><span className="tabular-nums">{percent(limit.percent)}%</span></div><p className="mt-1 text-xs text-muted">{resetTime(limit.resets_at)}</p></div>)}
      {usage?.extra_usage && <p className="mt-4 text-xs text-muted">추가 사용 {usage.extra_usage.is_enabled ? '활성화' : '비활성화'}{typeof usage.extra_usage.utilization === 'number' && ` · 사용 ${percent(usage.extra_usage.utilization)}%`}</p>}
      {data?.errors.usage && <p role="status" className="mt-4 text-xs leading-5 text-muted">{data.errors.usage.message}</p>}
      {usage && windows.length === 0 && namedLimits.length === 0 && <p className="mt-4 text-muted">제공된 사용 한도 정보가 없습니다.</p>}
      {data && <p className="mt-4 text-xs text-muted">마지막 조회 {new Date(data.checkedAt).toLocaleTimeString('ko-KR')} · 1분마다 조회, 요청 제한 시 대기</p>}
    </section>}
    <Tooltip content="CCG 백엔드 연결 상태" placement="top-end">
      <button ref={connectionButton} type="button" className="flex shrink-0 items-center gap-2 rounded px-2 py-1 hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground" aria-expanded={panel === Panel.Connection} aria-controls="backend-connection-panel" onClick={() => setPanel(panel === Panel.Connection ? null : Panel.Connection)}><span aria-hidden="true" className={`size-1.5 rounded-full ${ready ? 'bg-status' : 'bg-muted'}`} /><span>{connectionLabel}</span></button>
    </Tooltip>
    {panel === Panel.Connection && <section id="backend-connection-panel" aria-label="백엔드 연결 상세" className="absolute right-3 bottom-full z-50 mb-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-divider bg-navigation p-4 text-sm text-foreground"><h2 className="font-medium">CCG 백엔드</h2><p role="status" className="mt-3">{connectionLabel}</p><p className="mt-2 text-xs leading-5 text-muted">{ready ? '채팅 환경에 연결돼 있습니다.' : state.message}</p>{state.phase === DesktopPhase.Error && <button type="button" className="secondary-button mt-4" disabled={reconnect.isPending} onClick={() => reconnect.mutate()}>{reconnect.isPending ? '연결 중…' : '다시 연결'}</button>}{reconnect.error && <p role="alert" className="mt-3 text-xs text-muted">{reconnect.error.message}</p>}</section>}
  </footer>;
}
