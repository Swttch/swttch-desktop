import { useRef, useState, type ReactNode } from 'react';
import { SettingsRow, SettingsSwitch, SettingsSelect } from '../../SettingsControls';
import { i18n, useSettingsCopy } from '../../i18n';
import { ProviderScope, type SettingValue } from '../../../../src/provider-settings.mjs';
import { Tooltip } from '../../Tooltip';
import { useProviderField } from './store';

export function ProviderSettingControl({ settingKey, title, description, kind = 'text', fallback = '', options = [], disabled = false }: { settingKey: string; title: string; description?: string; kind?: 'text' | 'switch' | 'select'; fallback?: SettingValue; options?: { value: string; label: string }[]; disabled?: boolean }) {
  const field = useProviderField(settingKey, fallback);
  return <ProviderSettingFrame settingKey={settingKey} title={title} description={description} field={field}>
    {kind === 'select' ? <SettingsSelect label={title} value={String(field.value ?? '')} options={options} disabled={disabled || field.pending} onChange={value => { void field.save(value || null).catch(() => {}); }} /> : kind === 'switch' ? <SettingsSwitch label={title} checked={field.value === true} disabled={field.pending} onChange={value => { void field.save(value).catch(() => {}); }} /> : <ValueEditor key={JSON.stringify([field.scope, field.value])} title={title} value={field.value} pending={field.pending} onSave={field.save} />}
  </ProviderSettingFrame>;
}
export function ProviderSettingFrame({ settingKey, title, description, field, children, below = false, documentation }: { documentation?: string; settingKey: string; title: string; description?: string; field: ReturnType<typeof useProviderField>; children: ReactNode; below?: boolean }) {
  const copy = useSettingsCopy();
  const note = field.inherited ? copy.inheritedGlobal : field.shadowed ? copy.shadowedProject : field.scope === ProviderScope.Project ? copy.scopeProjectDescription : copy.scopeGlobalDescription;
  const docLocale = i18n.language === 'ko' ? 'ko' : 'en';
  const badgeLabel = field.inherited ? copy.inheritedBadge : field.scope === ProviderScope.Project || field.shadowed ? copy.projectBadge : copy.globalBadge;
  const badge = <Tooltip interactive={!field.inherited} content={<span className="inline-flex items-center gap-3">{note}{!field.inherited && <button type="button" className="shrink-0 underline hover:opacity-80 disabled:opacity-40" disabled={field.pending} onClick={() => { void field.save(null).catch(() => {}); }}>{field.scope === ProviderScope.Project ? copy.resetGlobal : copy.resetDefault}</button>}</span>}><span role="img" tabIndex={0} aria-label={`${title}: ${note}`} className={`inline-flex h-4 min-w-4 cursor-help items-center justify-center rounded px-1 text-[10px] font-semibold leading-none ${field.shadowed || field.scope === ProviderScope.Project && !field.inherited ? 'bg-amber-400/15 text-amber-300' : 'bg-selected text-muted'}`}>{badgeLabel}</span></Tooltip>;
  return <div>
    <SettingsRow title={title} description={description} badge={badge} settingPath={`$.${settingKey}`} settingDocumentation={documentation ?? `https://code.claude.com/docs/${docLocale}/settings-reference#${(settingKey === 'permissions.disableAutoMode' ? 'disableAutoMode' : settingKey).replaceAll('.', '-').toLowerCase()}`}>
      {!below && <div className="flex max-w-full flex-wrap items-center justify-end gap-2">{children}</div>}
    </SettingsRow>
    {below && <div className="pb-5">{children}</div>}
    {field.error && <p role="alert" className="pb-3 text-sm text-red-400">{field.error}</p>}
  </div>;
}
function ValueEditor({ title, value, pending, onSave }: { title: string; value: SettingValue; pending: boolean; onSave: (value: SettingValue) => Promise<void> }) {
  const original = String(value ?? '');
  const [draft, setDraft] = useState(original);
  const [error, setError] = useState('');
  const saved = useRef(original);
  const saving = useRef(false);
  const submit = async () => {
    if (pending || saving.current || draft === saved.current) return;
    let value: SettingValue;
    value = draft.trim() === '' ? null : draft.trim();
    setError('');
    saving.current = true;
    try { await onSave(value); saved.current = draft; }
    catch { /* The setting row displays the mutation error and keeps the draft. */ }
    finally { saving.current = false; }
  };
  const editor = <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
    <input aria-label={title} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => { void submit(); }} disabled={pending} className="w-48 max-w-full rounded-lg border border-divider bg-canvas px-3 py-2 text-sm" />
    {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
  </div>;
  return editor;
}
