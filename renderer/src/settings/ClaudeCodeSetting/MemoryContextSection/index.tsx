import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { CheckpointingSettingItem } from './CheckpointingSettingItem';
import { EnvironmentVariables } from './EnvironmentVariables';
export function MemoryContextSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicMemoryContext}><CheckpointingSettingItem /><EnvironmentVariables /></SettingsSection>;
}
