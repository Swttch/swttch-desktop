import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
export function FastModeSettingItem() {
  const copy = useSettingsCopy();
  return <ProviderSettingControl settingKey="fastMode" title={copy.providerFastMode} description={copy.providerFastDescription} kind="switch" fallback={false} />;
}
