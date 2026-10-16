import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
export function ThinkingSettingItem() {
  const copy = useSettingsCopy();
  return <ProviderSettingControl settingKey="alwaysThinkingEnabled" title={copy.providerThinking} description={copy.providerThinkingDescription} kind="switch" fallback={true} />;
}
