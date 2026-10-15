import { t, useShellTranslation } from './i18n';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { parseUsageReport } from '../../../../webview/src/components/AccountUsageModal/parseUsageReport';
import { desktopApi } from './api';
import { QUERY_KEY, queryClient } from './query-client';
import { RefreshButton } from './RefreshButton';

export function UsageReportSection({ enabled, project, accountsRevision }: { enabled: boolean; project: string | null; accountsRevision: number }) { useShellTranslation();
  const [tab, setTab] = useState(0);
  const key = QUERY_KEY.usageReport(project, accountsRevision);
  const query = useQuery({ queryKey: key, queryFn: ({ signal }) => desktopApi.usageReport(signal), enabled, staleTime: 60_000 });
  const refresh = useMutation({ mutationFn: desktopApi.refreshUsageReport, onSuccess: data => queryClient.setQueryData(key, data) });
  const data = query.data;
  const report = data?.status === 'ok' && data.report ? parseUsageReport(data.report) : null;
  const periods = report?.periods || [];
  const active = periods[Math.min(tab, Math.max(0, periods.length - 1))];
  const error = refresh.error?.message || query.error?.message || (data?.status !== 'ok' ? data?.error : null);
  return <section aria-label={t("Usage contributions")} className="mt-6 border-t border-divider pt-4">
    <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-muted">{t("Usage contributions")}</h3><RefreshButton label={t("Refresh usage contributions")} pending={query.isFetching || refresh.isPending} onClick={() => refresh.mutate()} /></div>
    {error && <p role="alert" className="text-xs leading-5 text-muted">{error}</p>}
    {query.isPending && <p role="status" className="text-xs text-muted">{t("Loading usage contributions.")}</p>}
    {periods.length > 1 && <div className="mb-3 flex gap-1" role="group" aria-label={t("Contribution period")}>{periods.map((period, index) => <button key={period.label} type="button" aria-pressed={index === Math.min(tab, periods.length - 1)} className={`rounded-md px-2.5 py-1 text-xs focus-visible:outline-2 focus-visible:outline-foreground ${index === Math.min(tab, periods.length - 1) ? 'bg-selected text-foreground' : 'text-muted hover:bg-selected'}`} onClick={() => setTab(index)}>{period.label}</button>)}</div>}
    {active && <div className="space-y-3">
      {(active.requests !== null || active.sessions !== null) && <p className="text-xs text-muted">{[active.requests !== null && t("Requests: {{count}}", { count: active.requests }), active.sessions !== null && t("Sessions: {{count}}", { count: active.sessions })].filter(Boolean).join(' · ')}</p>}
      {active.insights.length > 0 && <ul className="space-y-1.5">{active.insights.map((insight, index) => <li key={index} className="text-xs leading-5 text-muted">{insight}</li>)}</ul>}
      {active.breakdowns.map(breakdown => <div key={breakdown.title}><div className="mb-1 flex justify-between gap-3 text-[0.7rem] uppercase text-muted"><span>{breakdown.title.replace(/^Top /, '')}</span><span>{t("% of usage")}</span></div><div className="space-y-0.5">{breakdown.items.map(item => <div key={item.name} className="flex items-center justify-between gap-2 text-xs"><span className="truncate text-muted">{item.name}</span><span className="shrink-0 tabular-nums">{item.percent}%</span></div>)}</div></div>)}
    </div>}
    {report && periods.length === 0 && <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted">{report.raw}</pre>}
    {!query.isPending && !report && !error && <p className="text-xs text-muted">{t("No usage contribution data.")}</p>}
  </section>;
}
