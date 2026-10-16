import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { SettingsSwitch } from '../../../SettingsControls';
import { usePermissionField } from '../store';
export function DisableBypassModeSettingItem() {
  const copy = useSettingsCopy();
  const field = usePermissionField('disableBypassPermissionsMode', '');
  return <ProviderSettingFrame settingKey="permissions.disableBypassPermissionsMode" title={copy.disableBypassMode} description={copy.permissionDisableBypassModeDescription} field={field}><SettingsSwitch label={copy.disableBypassMode} checked={field.value === 'disable'} disabled={field.pending} onChange={checked => { void field.save(checked ? 'disable' : null).catch(() => {}); }} /></ProviderSettingFrame>;
}
