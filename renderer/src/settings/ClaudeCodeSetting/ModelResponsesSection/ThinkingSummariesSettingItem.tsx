import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
export function ThinkingSummariesSettingItem() {
  const copy = useSettingsCopy();
  return <ProviderSettingControl settingKey="showThinkingSummaries" title={copy.providerSummaries} description={copy.providerSummariesDescription} kind="switch" fallback={false} />;
}
