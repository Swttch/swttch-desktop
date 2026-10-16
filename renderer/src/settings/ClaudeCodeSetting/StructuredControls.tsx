import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSettingsCopy } from '../../i18n';
import { Tooltip } from '../../Tooltip';
import type { SettingValue } from '../../../../src/provider-settings.mjs';
export const inputClass = 'w-full min-w-0 rounded-lg border border-divider bg-canvas px-3 py-2 text-sm text-foreground focus:outline focus:outline-1 focus:outline-muted';
export function confirmingEnter(event: KeyboardEvent<HTMLInputElement>) {
  return event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229;
}
/** Keep rapid edits in order without replacing a newer local draft with an older response. */
export function useQueuedSetting(value: SettingValue, onSave: (value: SettingValue) => Promise<void>) {
  const [draft, setDraft] = useState(value);
  const latest = useRef(value); latest.current = value;
  const count = useRef(0);
  const queue = useRef(Promise.resolve());
  const serialized = JSON.stringify(value);
  useEffect(() => { if (count.current === 0) setDraft(latest.current); }, [serialized]);
  const update = (next: SettingValue) => {
    setDraft(next); count.current++;
    queue.current = queue.current.then(() => onSave(next)).catch(() => { if (count.current === 1) setDraft(latest.current); }).finally(() => { count.current--; });
  };
  return { draft, update };
}
export function TextEntry({ value, label, onCommit, type = 'text', placeholder, disabled = false }: { value: string; label: string; onCommit: (value: string) => void; type?: string; placeholder?: string; disabled?: boolean }) {
  const [draft, setDraft] = useState(value);
  const last = useRef(value);
  useEffect(() => { setDraft(value); last.current = value; }, [value]);
  const commit = () => { if (draft !== last.current) { last.current = draft; onCommit(draft); } };
  return <input type={type} disabled={disabled} placeholder={placeholder} aria-label={label} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (confirmingEnter(event)) { event.preventDefault(); commit(); } }} className={inputClass} />;
}
export function RemoveEntry({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <Tooltip content={label}><button type="button" data-remove aria-label={label} onPointerDown={event => event.preventDefault()} onClick={onRemove} className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-selected hover:text-foreground"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="1.6"><path d="m6 6 12 12M6 18 18 6" /></svg></button></Tooltip>;
}
export function StringListEditor({ label, values, onChange, placeholder }: { placeholder?: string; label: string; values: string[]; onChange: (values: string[]) => void }) {
  const copy = useSettingsCopy();
  const [next, setNext] = useState('');
  const draft = useRef('');
  const add = () => { const value = draft.current.trim(); draft.current = ''; setNext(''); if (value) onChange([value, ...values]); };
  return <div role="group" aria-label={label} className="min-w-0 space-y-2"><input aria-label={`${label}: ${copy.addEntry}`} placeholder={placeholder ?? copy.addEntry} value={next} onChange={event => { draft.current = event.target.value; setNext(event.target.value); }} onBlur={add} onKeyDown={event => { if (confirmingEnter(event)) { event.preventDefault(); add(); } }} className={inputClass} /><ul className="space-y-2">{values.map((value,index) => <li key={index} className="relative"><div className="[&>input]:pe-10"><TextEntry label={`${label}: ${value}`} value={value} onCommit={next => onChange(next.trim() ? values.map((item,i) => i === index ? next.trim() : item) : values.filter((_,i) => i !== index))} /></div><div className="absolute end-1 top-1"><RemoveEntry label={`${copy.removeEntry}: ${value}`} onRemove={() => onChange(values.filter((_,i) => i !== index))} /></div></li>)}</ul></div>;
}
export function stringValues(value: SettingValue | undefined): string[] { return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []; }
