import { useSettingsCopy } from '../../../i18n';
import { ProviderSettingControl } from '../ProviderSettingControl';
export function RespectGitignoreSettingItem() {
  const copy = useSettingsCopy();
  return <ProviderSettingControl settingKey="respectGitignore" title={copy.respectGitignore} description={copy.respectGitignoreDescription} kind="switch" fallback={true} />;
}
