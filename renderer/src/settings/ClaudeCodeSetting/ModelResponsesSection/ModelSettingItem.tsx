import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
import { useProviderCatalog, useProviderScope, useProviderSettings } from '../store';
import { providerField, providerModelOptions } from '../../../../../src/provider-settings.mjs';
import { SettingsLoading } from '../../SettingsLoading';
export function ModelSettingItem() {
  const copy = useSettingsCopy();
  const catalog = useProviderCatalog();
  const query = useProviderSettings();
  const scope = useProviderScope(state => state.scope);
  const models = catalog.data?.controlResponse?.response?.response?.models || [];
  const current = String(providerField(query.data, scope, 'model', '').value);
  return <><ProviderSettingControl settingKey="model" title={copy.providerModel} description={copy.providerModelDescription} kind="select" fallback="" options={providerModelOptions(models, current, copy.providerDefault)} disabled={catalog.isPending || models.length === 0} />
    {catalog.isPending && <SettingsLoading label={copy.providerCatalogLoading} />}
    {catalog.error && <div role="alert" className="pb-3 text-sm text-muted"><p>{catalog.error.message}</p><button type="button" className="settings-select mt-2" onClick={() => { void catalog.refetch(); }}>{copy.retry}</button></div>}
  </>;
}
