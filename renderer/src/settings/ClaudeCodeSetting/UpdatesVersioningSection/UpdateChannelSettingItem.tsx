import { useSettingsCopy } from '../../../i18n';
import { SettingsSelect } from '../../../SettingsControls';
import { ProviderScope } from '../../../../../src/provider-settings.mjs';
import { SettingsLoading } from '../../SettingsLoading';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { useProviderScope } from '../store';
import { useCliAutoUpdate } from '../useCliAutoUpdate';
import { Tooltip } from '../../../Tooltip';
export function UpdateChannelSettingItem() {
  const copy = useSettingsCopy();
  const scope = useProviderScope(state => state.scope);
  const {query,channel,lockText,saving} = useCliAutoUpdate();
  const value = query.data?.channel ?? 'latest';
  const disabled = scope === ProviderScope.Project || !query.data?.enabled || saving;
  const note = scope === ProviderScope.Project ? copy.globalOnly : lockText || copy.autoUpdate;
  const field = {scope:ProviderScope.Global,value,scopeValue:value,inherited:false,shadowed:false,pending:disabled,error:query.error?.message || channel.error?.message,save:async (next: import('../../../../../src/provider-settings.mjs').SettingValue) => { await channel.mutateAsync(String(next ?? 'latest')); }};
  const options = [{value:'latest',label:copy.updateChannelLatest},{value:'stable',label:copy.updateChannelStable},...(value === 'rc' ? [{value:'rc',label:copy.updateChannelRc}] : [])];
  return <ProviderSettingFrame settingKey="autoUpdatesChannel" title={copy.updateChannel} description={copy.updateChannelDescription} field={field}>{!query.data && !query.error ? <SettingsLoading label={copy.providerLoading} /> : <Tooltip content={disabled ? note : copy.globalOnly}><span><SettingsSelect label={copy.updateChannel} value={value} options={options} disabled={disabled} onChange={value => { void channel.mutateAsync(value).catch(() => {}); }} /></span></Tooltip>}</ProviderSettingFrame>;
}
