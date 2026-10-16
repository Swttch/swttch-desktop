import { useSettingsCopy } from '../../../i18n';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';
import { Tooltip } from '../../../Tooltip';
import { SettingsLoading } from '../../SettingsLoading';
import { useProviderScope } from '../store';
import { useCliAutoUpdate } from '../useCliAutoUpdate';
export function AutoUpdateSettingItem() {
  const copy = useSettingsCopy();
  const scope = useProviderScope(state => state.scope);
  const {query,enabled,lockText,saving} = useCliAutoUpdate();
  const disabled = scope === 'project' || !query.data || !!query.data.lock || saving;
  const note = scope === 'project' ? copy.globalOnly : lockText || copy.globalOnly;
  return <div><SettingsRow title={copy.autoUpdate} description={copy.autoUpdateDescription} settingPath="$.env.DISABLE_AUTOUPDATER" settingDocumentation="https://code.claude.com/docs/en/settings#environment-variables" badge={<Tooltip content={note}><span role="img" tabIndex={0} aria-label={note} className="rounded bg-selected px-1 text-[10px] text-muted">{copy.globalBadge}</span></Tooltip>}>{!query.data && !query.error ? <SettingsLoading label={copy.providerLoading} /> : <Tooltip content={note}><span><SettingsSwitch label={copy.autoUpdate} checked={query.data?.enabled ?? true} disabled={disabled} onChange={value => { void enabled.mutateAsync(value).catch(() => {}); }} /></span></Tooltip>}</SettingsRow>{(query.error || enabled.error) && <p role="alert" className="pb-3 text-sm text-red-400">{query.error?.message || enabled.error?.message}</p>}</div>;
}
