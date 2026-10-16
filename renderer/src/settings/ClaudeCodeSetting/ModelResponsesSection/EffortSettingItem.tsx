import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
import { useProviderCatalog, useProviderScope, useProviderSettings } from '../store';
import { providerField, providerEffortOptions } from '../../../../../src/provider-settings.mjs';
export function EffortSettingItem() {
  const copy = useSettingsCopy();
  const catalog = useProviderCatalog();
  const query = useProviderSettings();
  const scope = useProviderScope(state => state.scope);
  const models = catalog.data?.controlResponse?.response?.response?.models || [];
  const model = String(providerField(query.data, scope, 'model', '').value);
  const options = providerEffortOptions(models, model, copy.providerAuto);
  return <ProviderSettingControl settingKey="effortLevel" title={copy.effortLevel} description={copy.effortDescription} kind="select" fallback="" options={options} disabled={catalog.isPending || options.length === 1} />;
}
