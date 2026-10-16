import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
export function ResponseLanguageSettingItem() {
  const copy = useSettingsCopy();
  return <ProviderSettingControl settingKey="language" title={copy.responseLanguage} description={copy.responseLanguageDescription} kind="text" fallback={''} />;
}
