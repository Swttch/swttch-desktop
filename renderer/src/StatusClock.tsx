import { DateTimeSection } from './settings/GeneralSetting/DateTimeSection';
import { useSettingsStore } from './settings/store';
import { useEffect, useState } from 'react';
import { Dropdown } from './Dropdown';
import { Tooltip } from './Tooltip';

export function StatusClock() {
  const [now, setNow] = useState(() => new Date());
  const settings = useSettingsStore(state => state.values.clock);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const zone = settings.timeZone || undefined;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hourCycle: 'h23', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value || '';
  const hour = Number(part('hour'));
  const time = `${settings.hourCycle === '12' ? `${hour < 12 ? '오전' : '오후'} ${String(hour % 12 || 12).padStart(2, '0')}` : part('hour')}:${part('minute')}${settings.seconds ? `:${part('second')}` : ''}`;
  const date = settings.dateFormat === 'long' ? `${Number(part('month'))}월 ${Number(part('day'))}일` : `${part('month')}.${part('day')}`;
  const day = new Intl.DateTimeFormat('ko-KR', { timeZone: zone, weekday: 'short' }).format(now);
  const content = <div id="clock-settings" className="max-h-[75dvh] w-80 overflow-y-auto rounded-xl bg-navigation p-3"><DateTimeSection /></div>;
  return <Dropdown content={content}><Tooltip content="시계 표시 설정" placement="top-end"><button type="button" aria-label="시계 설정" aria-expanded="false" aria-controls="clock-settings" className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-muted hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground">
    {settings.display === 'time' && <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
    <span role="timer" aria-label="현재 날짜와 시간" className="flex flex-col items-end whitespace-nowrap text-[9px] leading-3 tabular-nums">{settings.display === 'date-time' && <span>{date}{settings.weekday ? ` (${day})` : ''}</span>}<small className="text-[9px] leading-3">{time}</small></span>
  </button></Tooltip></Dropdown>;
}
