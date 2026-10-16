import { useEffect, useState } from 'react';
import { useSettingsCopy } from '../../i18n';
import { settingObject, spinnerVerbsValue, type SettingValue } from '../../../../src/provider-settings.mjs';
import { StringListEditor, stringValues, useQueuedSetting } from './StructuredControls';
export function SpinnerVerbsEditor({ value, onSave }: { value: SettingValue; onSave: (value: SettingValue) => Promise<void> }) {
  const copy = useSettingsCopy();
  const { draft, update } = useQueuedSetting(value, onSave);
  const stored = settingObject(draft);
  const sourceMode = settingObject(value).mode === 'replace' ? 'replace' : 'append';
  const [emptyMode, setEmptyMode] = useState(sourceMode);
  useEffect(() => setEmptyMode(sourceMode), [sourceMode]);
  const mode = stored.mode === 'replace' ? 'replace' : stored.mode === 'append' ? 'append' : emptyMode;
  const verbs = stringValues(stored.verbs);
  return <div className="space-y-3"><div><div className="flex items-center justify-between gap-4"><span className="text-sm text-muted">{copy.spinnerMode}</span><div role="group" aria-label={copy.spinnerMode} className="inline-flex rounded-lg bg-canvas p-1">{['append','replace'].map(option => <button type="button" key={option} data-mode={option} aria-pressed={mode === option} onClick={() => { setEmptyMode(option); if (verbs.length) update(spinnerVerbsValue(draft, option, verbs)); }} className={`rounded-md px-3 py-1.5 text-sm ${mode === option ? 'bg-selected' : 'text-muted hover:bg-selected'}`}>{option}</button>)}</div></div><p className="mt-1 text-end text-xs text-muted">{mode === 'replace' ? copy.spinnerReplaceHint : copy.spinnerAppendHint}</p></div><div className="grid gap-3 sm:grid-cols-[auto_1fr]"><span className="pt-2 text-sm text-muted">{copy.spinnerVerbs}</span><div className="ms-auto w-full max-w-sm"><StringListEditor placeholder={copy.spinnerPlaceholder} label={copy.spinnerVerbs} values={verbs} onChange={values => update(spinnerVerbsValue(draft, mode, values))} /></div></div></div>;
}
