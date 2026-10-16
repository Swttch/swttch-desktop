import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { UpdateChannelSettingItem } from './UpdateChannelSettingItem';
export function UpdatesVersioningSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicUpdatesVersioning}><UpdateChannelSettingItem /></SettingsSection>;
}
