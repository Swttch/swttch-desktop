import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { SettingsSelect } from '../../../SettingsControls';
import { useProviderCatalog, useProviderSettings, usePermissionField } from '../store';
import { settingObject } from '../../../../../src/provider-settings.mjs';
export function DefaultModeSettingItem() {
  const copy = useSettingsCopy();
  const field = usePermissionField('defaultMode', '');
  const query = useProviderSettings();
  const catalog = useProviderCatalog();
  const parent = settingObject(query.data?.effectiveSettings.permissions);
  const mode = String(field.value ?? '');
  const auto = parent.disableAutoMode !== 'disable' && (mode === 'auto' || catalog.data?.controlResponse?.response?.response?.models?.some(model => model.supportsAutoMode));
  const modes = ['default', 'acceptEdits', 'plan', 'dontAsk', ...(auto ? ['auto'] : []), ...(parent.disableBypassPermissionsMode !== 'disable' || mode === 'bypassPermissions' ? ['bypassPermissions'] : [])];
  return <ProviderSettingFrame settingKey="permissions.defaultMode" title={copy.permissionMode} description={copy.permissionDefaultModeDescription} field={field}><SettingsSelect label={copy.permissionMode} value={mode} disabled={field.pending} options={[{value:'',label:field.scope === 'project' ? copy.resetGlobal : copy.resetDefault}, ...modes.map(value => ({value,label:value}))]} onChange={value => { void field.save(value || null).catch(() => {}); }} /></ProviderSettingFrame>;
}
