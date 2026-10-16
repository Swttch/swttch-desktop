import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { usePermissionField } from '../store';
import { StringListEditor, stringValues, useQueuedSetting } from '../StructuredControls';
export function AskRulesSettingItem() {
  const copy = useSettingsCopy();
  const field = usePermissionField('ask', []);
  const { draft, update } = useQueuedSetting(field.value, field.save);
  return <ProviderSettingFrame settingKey="permissions.ask" title={copy.permissionAsk} description={copy.permissionAskRulesDescription} field={field} below><details><summary className="cursor-pointer text-sm text-muted">{copy.editSetting} ({stringValues(draft).length})</summary><div className="pt-3"><StringListEditor label={copy.permissionAsk} values={stringValues(draft)} onChange={update} /></div></details></ProviderSettingFrame>;
}
