import { t, useShellTranslation } from './i18n';
import type { UsageBucket } from '@swttch/extend-kit/battery';
import { Tooltip } from './Tooltip';

export function AccountBattery({ window, focusable = true, compact = false }: { window: UsageBucket | null | undefined; focusable?: boolean; compact?: boolean }) { useShellTranslation();
  const remaining = window ? 100 - Math.round(Math.max(0, Math.min(100, window.utilization))) : null;
  const color = remaining === null ? undefined : remaining > 50 ? '#22c55e' : remaining >= 20 ? '#eab308' : '#ef4444';
  const reset = window?.resets_at && Number.isFinite(Date.parse(window.resets_at)) ? new Date(window.resets_at).toLocaleString('ko-KR') : null;
  return <Tooltip content={reset ? `${t("Session (5 hours)")}: ${reset}` : t("No reset time")} placement="top-end"><span tabIndex={focusable ? 0 : undefined} aria-label={`${t("Remaining 5-hour quota")}: ${remaining === null ? t("Not checked") : `${remaining}%`}`} className={`flex shrink-0 items-center tabular-nums ${compact ? 'gap-0.5 text-xs' : 'gap-1.5'}`} style={{ color }}><svg aria-hidden="true" viewBox="0 0 16 16" className={compact ? 'size-4' : 'size-5'} fill="currentColor"><rect x="1" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" /><rect x="13" y="6.5" width="1.5" height="3" rx=".5" />{remaining !== null && <rect x="2.5" y="5.5" width={9 * remaining / 100} height="5" rx=".5" />}</svg><span>{remaining === null ? '—' : `${remaining}%`}</span></span></Tooltip>;
}
