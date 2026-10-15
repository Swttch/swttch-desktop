import { t, useShellTranslation } from './i18n';
import { DateTimeSection } from './settings/GeneralSetting/DateTimeSection';
import { useSettingsStore } from './settings/store';
import { useEffect, useState } from 'react';
import { Dropdown } from './Dropdown';
import { Tooltip } from './Tooltip';

export function StatusClock() { const { i18n } = useShellTranslation();
  const [now, setNow] = useState(() => new Date());
  const settings = useSettingsStore(state => state.values.clock);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const zone = settings.timeZone || undefined;
  const locale = i18n.language;
  const time = new Intl.DateTimeFormat(locale, { timeZone: zone, hour12: settings.hourCycle === '12', hour: '2-digit', minute: '2-digit', ...(settings.seconds ? { second: '2-digit' } : {}) }).format(now);
  const date = new Intl.DateTimeFormat(locale, { timeZone: zone, month: settings.dateFormat === 'long' ? 'long' : '2-digit', day: 'numeric', ...(settings.weekday ? { weekday: 'short' } : {}) }).format(now);
  const content = <div id="clock-settings" className="max-h-[75dvh] w-80 overflow-y-auto rounded-xl bg-navigation p-3"><DateTimeSection /></div>;
  return <Dropdown content={content}><Tooltip content={t("Clock display settings")} placement="top-end"><button type="button" aria-label={t("Clock settings")} aria-expanded="false" aria-controls="clock-settings" className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-muted hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground">
    {settings.display === 'time' && <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
    <span role="timer" aria-label={t("Current date and time")} className="flex flex-col items-end whitespace-nowrap text-[9px] leading-3 tabular-nums">{settings.display === 'date-time' && <span>{date}</span>}<small className="text-[9px] leading-3">{time}</small></span>
  </button></Tooltip></Dropdown>;
}
