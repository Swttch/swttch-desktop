import { useRef, type ReactNode } from 'react';
import { Dropdown } from './Dropdown';
import { SettingsIcon } from './SettingsIcon';

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="settings-section"><h3>{title}</h3><div className="settings-card">{children}</div></section>;
}
export function SettingsRow({ title, description, children, pending = false }: { title: string; description?: string; children?: ReactNode; pending?: boolean }) {
  return <div className="settings-row" data-pending={pending || undefined}><div className="min-w-0 flex-1"><p className="settings-row-title">{title}</p>{description && <p className="settings-row-description">{description}</p>}</div>{children && <div className="settings-row-control">{children}</div>}</div>;
}
export function SettingsSwitch({ label, checked = false, disabled = false, onChange }: { label: string; checked?: boolean; disabled?: boolean; onChange?: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange?.(!checked)} className={`settings-switch ${checked ? 'is-on' : ''}`}><span /></button>;
}
export function SettingsSelect({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  const close = useRef<(() => void) | null>(null);
  const selected = options.find(option => option.value === value);
  const button = <button type="button" aria-label={label} disabled={disabled} className="settings-select">{selected?.label || value}<SettingsIcon kind="down" className="!size-3.5 text-muted" /></button>;
  if (disabled) return button;
  return <Dropdown closeRef={close} content={<div role="group" aria-label={label} className="max-h-72 min-w-36 overflow-y-auto rounded-xl border border-divider bg-[#2d2d2d] p-1.5 text-sm text-foreground shadow-lg">{options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} className={`block w-full rounded-lg px-3 py-2 text-start hover:bg-[#414141] ${option.value === value ? 'bg-[#3a3a3a]' : ''}`} onClick={() => { onChange(option.value); close.current?.(); }}>{option.label}</button>)}</div>}>{button}</Dropdown>;
}
