import { useSettingsCopy } from '../../../i18n';
import { useProviderSettings } from '../store';
import { settingObject } from '../../../../../src/provider-settings.mjs';
import { ConfigDirectorySettingItem } from './ConfigDirectorySettingItem';
import { AutoUpdateSettingItem } from './AutoUpdateSettingItem';
import { NonessentialTrafficSettingItem } from './NonessentialTrafficSettingItem';
import { EnvironmentVariableSettingItem } from './EnvironmentVariableSettingItem';
import { AddEnvironmentVariableSettingItem } from './AddEnvironmentVariableSettingItem';
/** Known environment keys keep dedicated controls even when no value is stored. */
export function EnvironmentVariables() {
  const copy = useSettingsCopy();
  const query = useProviderSettings();
  const env = {...settingObject(query.data?.effectiveSettings.env), ...settingObject(query.data?.settings.env)};
  const keys = Object.keys(env).filter(key => !['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC','DISABLE_AUTOUPDATER','CLAUDE_CONFIG_DIR'].includes(key) && typeof env[key] === 'string');
  return <><div className="pt-5 pb-1"><h4 className="text-sm font-medium">{copy.providerEnv}</h4><p className="settings-row-description">{copy.providerEnvironmentDescription}</p></div><ConfigDirectorySettingItem /><NonessentialTrafficSettingItem /><AutoUpdateSettingItem />{keys.map(name => <EnvironmentVariableSettingItem key={name} name={name} />)}<AddEnvironmentVariableSettingItem /></>;
}
