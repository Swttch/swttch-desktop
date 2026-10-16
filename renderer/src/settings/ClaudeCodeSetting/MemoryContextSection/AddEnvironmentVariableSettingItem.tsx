import { useRef, useState } from 'react';
import { useSettingsCopy } from '../../../i18n';
import { SettingsRow } from '../../../SettingsControls';
import { useProviderField } from '../store';
import { confirmingEnter, inputClass } from '../StructuredControls';
import { settingObject, updateProviderEntry } from '../../../../../src/provider-settings.mjs';
export function AddEnvironmentVariableSettingItem() {
  const copy = useSettingsCopy();
  const field = useProviderField('env', {});
  const own = settingObject(field.scopeValue);
  const [name,setName] = useState(''); const [value,setValue] = useState(''); const [error,setError] = useState('');
  const entered = useRef({ name:'',value:'' }); entered.current = { name,value };
  const add = () => {
    const next = entered.current; const key = next.name.trim(); if (!key) return;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || ['__proto__','constructor','prototype'].includes(key)) { setError(copy.invalidEnvironmentName); return; }
    if (['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC','DISABLE_AUTOUPDATER','CLAUDE_CONFIG_DIR'].includes(key)) { setError(key === 'DISABLE_AUTOUPDATER' ? copy.autoUpdate : key === 'CLAUDE_CONFIG_DIR' ? 'CLAUDE_CONFIG_DIR' : copy.nonessentialTraffic); return; }
    if (Object.hasOwn(own,key)) { setError(copy.duplicateEnvironmentName); return; }
    void field.save(updateProviderEntry(field.scopeValue,key,next.value)).catch(() => {}); entered.current = {name:'',value:''};setName('');setValue('');setError('');
  };
  return <div><SettingsRow title={copy.addEnvironmentVariable}><div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_28px] gap-2" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) add(); }}><input aria-label={copy.environmentName} placeholder={copy.environmentName} value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (confirmingEnter(event)) { event.preventDefault(); add(); } }} className={inputClass} /><input aria-label={copy.environmentValue} placeholder={copy.environmentValue} value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (confirmingEnter(event)) { event.preventDefault(); add(); } }} className={inputClass} /><span /></div></SettingsRow>{(error || field.error) && <p role="alert" className="pb-3 text-xs text-red-400">{error || field.error}</p>}</div>;
}
