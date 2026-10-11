import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { parseUsageReport } from '../../../../webview/src/components/AccountUsageModal/parseUsageReport';
import { desktopApi } from './api';
import { QUERY_KEY, queryClient } from './query-client';
import { RefreshButton } from './RefreshButton';

export function UsageReportSection({ enabled, project, accountsRevision }: { enabled: boolean; project: string | null; accountsRevision: number }) {
  const [tab, setTab] = useState(0);
  const key = QUERY_KEY.usageReport(project, accountsRevision);
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => desktopApi.usageReport(signal), enabled, staleTime: 60_000 });
  const refresh = useMutation({ mutationFn: desktopApi.refreshUsageReport, onSuccess: data => queryClient.setQueryData(key, data) });
  const data = query.data;
  const report = data?.status === 'ok' && data.report ? parseUsageReport(data.report) : null;
  const periods = report?.periods || [];
  const active = periods[Math.min(tab, Math.max(0, periods.length - 1))];
  const error = refresh.error?.message || query.error?.message || (data?.status !== 'ok' ? data?.error : null);
  return <section aria-label="사용량 기여도" className="mt-6 border-t border-divider pt-4">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-muted">사용량 기여도</h3><RefreshButton label="사용량 기여도 새로고침" pending={query.isFetching || refresh.isPending} onClick={() => refresh.mutate()} /></div>
    {error && <p role="alert" className="text-xs leading-5 text-muted">{error}</p>}
    {query.isPending && <p role="status" className="text-xs text-muted">사용량 기여도를 불러오고 있습니다.</p>}
    {periods.length > 1 && <div className="mb-3 flex gap-1" role="group" aria-label="기여도 기간">{periods.map((period, index) => <button key={period.label} type="button" aria-pressed={index === Math.min(tab, periods.length - 1)} className={`rounded-md px-2.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-foreground ${index === Math.min(tab, periods.length - 1) ? 'bg-selected text-foreground' : 'text-muted hover:bg-selected'}`} onClick={() => setTab(index)}>{period.label}</button>)}</div>}
    {active && <div className="space-y-3">
      {(active.requests !== null || active.sessions !== null) && <p className="text-xs text-muted">{[active.requests !== null && `요청 ${active.requests.toLocaleString()}건`, active.sessions !== null && `세션 ${active.sessions.toLocaleString()}개`].filter(Boolean).join(' · ')}</p>}
      {active.insights.length > 0 && <ul className="space-y-1.5">{active.insights.map((insight, index) => <li key={index} className="text-xs leading-5 text-muted">{insight}</li>)}</ul>}
      {active.breakdowns.map(breakdown => <div key={breakdown.title}><div className="mb-1 flex justify-between gap-3 text-[0.7rem] uppercase text-muted"><span>{breakdown.title.replace(/^Top /, '')}</span><span>% 사용량</span></div><div className="space-y-0.5">{breakdown.items.map(item => <div key={item.name} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-muted">{item.name}</span><span className="shrink-0 tabular-nums">{item.percent}%</span></div>)}</div></div>)}
    </div>}
    {report && periods.length === 0 && <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted">{report.raw}</pre>}
    {!query.isPending && !report && !error && <p className="text-xs text-muted">사용량 기여도 정보가 없습니다.</p>}
  </section>;
}
