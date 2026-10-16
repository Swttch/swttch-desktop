import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { usePermissionField } from '../store';
import { StringListEditor, stringValues, useQueuedSetting } from '../StructuredControls';
export function AllowRulesSettingItem() {
  const copy = useSettingsCopy();
  const field = usePermissionField('allow', []);
  const { draft, update } = useQueuedSetting(field.value, field.save);
  return <ProviderSettingFrame settingKey="permissions.allow" title={copy.permissionAllow} description={copy.permissionAllowRulesDescription} field={field} below><details><summary className="cursor-pointer text-sm text-muted">{copy.editSetting} ({stringValues(draft).length})</summary><div className="pt-3"><StringListEditor label={copy.permissionAllow} values={stringValues(draft)} onChange={update} /></div></details></ProviderSettingFrame>;
}
