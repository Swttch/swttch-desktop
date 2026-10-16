import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingFrame } from '../ProviderSettingControl';
import { useProviderField } from '../store';
import { SpinnerVerbsEditor } from '../SpinnerVerbsEditor';
export function SpinnerVerbsSettingItem() {
  const copy = useSettingsCopy();
  const field = useProviderField('spinnerVerbs', null);
  return <ProviderSettingFrame settingKey="spinnerVerbs" title={copy.providerSpinner} description={copy.providerSpinnerDescription} field={field} below><SpinnerVerbsEditor value={field.value} onSave={field.save} /></ProviderSettingFrame>;
}
