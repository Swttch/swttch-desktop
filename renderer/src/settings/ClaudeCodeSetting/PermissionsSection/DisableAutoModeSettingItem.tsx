import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { SettingsSwitch } from '../../../SettingsControls';
import { usePermissionField } from '../store';
export function DisableAutoModeSettingItem() {
  const copy = useSettingsCopy();
  const field = usePermissionField('disableAutoMode', '');
  return <ProviderSettingFrame settingKey="permissions.disableAutoMode" title={copy.disableAutoMode} description={copy.permissionDisableAutoModeDescription} field={field}><SettingsSwitch label={copy.disableAutoMode} checked={field.value === 'disable'} disabled={field.pending} onChange={checked => { void field.save(checked ? 'disable' : null).catch(() => {}); }} /></ProviderSettingFrame>;
}
