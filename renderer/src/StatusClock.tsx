import { useEffect, useState } from 'react';
import { Dropdown } from './Dropdown';
import { Tooltip } from './Tooltip';

const STORAGE_KEY = 'swttch-status-clock-settings';
type ClockSettings = { display: 'time' | 'date-time'; hourCycle: '12' | '24'; seconds: boolean; weekday: boolean; dateFormat: 'long' | 'short'; timeZone: string };
const defaults: ClockSettings = { display: 'date-time', hourCycle: '12', seconds: false, weekday: true, dateFormat: 'long', timeZone: '' };
function validTimeZone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { new Intl.DateTimeFormat('ko-KR', { timeZone: value || undefined }); return true; } catch { return false; }
}
function readSettings(): ClockSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { display: saved?.display === 'time' || (!saved?.display && localStorage.getItem('swttch-status-clock-display') === 'time') ? 'time' : 'date-time', hourCycle: saved?.hourCycle === '24' ? '24' : '12', seconds: saved?.seconds === true, weekday: saved?.weekday !== false, dateFormat: saved?.dateFormat === 'short' ? 'short' : 'long', timeZone: validTimeZone(saved?.timeZone) ? saved.timeZone : '' };
  } catch { return defaults; }
}
const timeZones = (() => {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  const local = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return [...new Set(['UTC', local, ...(intl.supportedValuesOf?.('timeZone') || ['Asia/Seoul', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles'])])].sort();
})();

export function StatusClock() {
  const [now, setNow] = useState(() => new Date());
  const [settings, setSettings] = useState<ClockSettings>(readSettings);
  const [zoneSearch, setZoneSearch] = useState('');
  function updateSettings(patch: Partial<ClockSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Retain the preference for this window. */ }
  }
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
  const filteredZones = timeZones.filter(value => value.toLowerCase().includes(zoneSearch.trim().toLowerCase()));
  const content = <section id="clock-settings" aria-label="시계 설정" className="max-h-[75dvh] w-64 overflow-y-auto rounded-lg border border-divider bg-navigation p-3 text-sm text-foreground">
    <fieldset><legend className="mb-1 text-xs font-medium text-muted">시계 표시</legend>{([{ value: 'time', label: '아이콘 + 시간만' }, { value: 'date-time', label: '날짜 + 시간' }] as const).map(option => <label key={option.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-selected"><input type="radio" name="clock-display" checked={settings.display === option.value} onChange={() => updateSettings({ display: option.value })} className="accent-foreground" />{option.label}</label>)}</fieldset>
    <fieldset className="mt-3 border-t border-divider pt-3"><legend className="text-xs font-medium text-muted">시간 형식</legend><div className="flex gap-3 px-2 py-2">{(['12', '24'] as const).map(value => <label key={value} className="flex cursor-pointer items-center gap-2"><input type="radio" name="clock-hour-cycle" checked={settings.hourCycle === value} onChange={() => updateSettings({ hourCycle: value })} className="accent-foreground" />{value}시간제</label>)}</div><label className="flex cursor-pointer items-center justify-between px-2 py-1.5">초 표시<input type="checkbox" checked={settings.seconds} onChange={event => updateSettings({ seconds: event.target.checked })} className="accent-foreground" /></label></fieldset>
    <fieldset disabled={settings.display === 'time'} className="mt-3 border-t border-divider pt-3 disabled:opacity-50"><legend className="text-xs font-medium text-muted">날짜 형식</legend>{([{ value: 'long', label: '10월 12일' }, { value: 'short', label: '10.12' }] as const).map(option => <label key={option.value} className="flex items-center gap-2 px-2 py-1.5"><input type="radio" name="clock-date-format" checked={settings.dateFormat === option.value} onChange={() => updateSettings({ dateFormat: option.value })} className="accent-foreground" />{option.label}</label>)}<label className="flex items-center justify-between px-2 py-1.5">요일 표시<input type="checkbox" checked={settings.weekday} onChange={event => updateSettings({ weekday: event.target.checked })} className="accent-foreground" /></label></fieldset>
    <fieldset className="mt-3 border-t border-divider pt-3"><legend className="text-xs font-medium text-muted">시간대</legend><label className="flex items-center gap-2 px-2 py-1.5"><input type="radio" name="clock-time-zone-mode" checked={!settings.timeZone} onChange={() => updateSettings({ timeZone: '' })} className="accent-foreground" />컴퓨터 설정</label><label className="flex items-center gap-2 px-2 py-1.5"><input type="radio" name="clock-time-zone-mode" checked={!!settings.timeZone} onChange={() => updateSettings({ timeZone: new Intl.DateTimeFormat().resolvedOptions().timeZone })} className="accent-foreground" />지정 시간대</label>
      {settings.timeZone && <div className="mt-2"><p className="mb-2 px-2 text-xs text-muted">{settings.timeZone}</p><input type="search" aria-label="시간대 검색" placeholder="Seoul, London, UTC…" value={zoneSearch} onChange={event => setZoneSearch(event.target.value)} className="w-full rounded border border-divider bg-canvas px-2 py-1.5 text-xs" /><div role="group" aria-label="시간대 선택" className="mt-1 max-h-28 overflow-y-auto">{filteredZones.map(value => <button key={value} type="button" aria-pressed={settings.timeZone === value} className={`block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-selected ${settings.timeZone === value ? 'bg-selected' : ''}`} onClick={() => updateSettings({ timeZone: value })}>{value}</button>)}{filteredZones.length === 0 && <p className="p-2 text-xs text-muted">일치하는 시간대가 없습니다.</p>}</div></div>}
    </fieldset>
  </section>;
  return <Dropdown content={content}><Tooltip content="시계 표시 설정" placement="top-end"><button type="button" aria-label="시계 설정" aria-expanded="false" aria-controls="clock-settings" className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-muted hover:bg-selected focus-visible:outline-2 focus-visible:outline-foreground">
    {settings.display === 'time' && <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
    <span role="timer" aria-label="현재 날짜와 시간" className="flex flex-col items-end whitespace-nowrap text-[9px] leading-3 tabular-nums">{settings.display === 'date-time' && <span>{date}{settings.weekday ? ` (${day})` : ''}</span>}<small className="text-[9px] leading-3">{time}</small></span>
  </button></Tooltip></Dropdown>;
}
