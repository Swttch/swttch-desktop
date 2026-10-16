import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { DefaultModeSettingItem } from './DefaultModeSettingItem';
import { DisableBypassModeSettingItem } from './DisableBypassModeSettingItem';
import { DisableAutoModeSettingItem } from './DisableAutoModeSettingItem';
import { AllowRulesSettingItem } from './AllowRulesSettingItem';
import { AskRulesSettingItem } from './AskRulesSettingItem';
import { DenyRulesSettingItem } from './DenyRulesSettingItem';
import { AdditionalDirectoriesSettingItem } from './AdditionalDirectoriesSettingItem';
export function PermissionsSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicPermissions}><DefaultModeSettingItem /><DisableBypassModeSettingItem /><DisableAutoModeSettingItem /><AllowRulesSettingItem /><AskRulesSettingItem /><DenyRulesSettingItem /><AdditionalDirectoriesSettingItem /></SettingsSection>;
}
