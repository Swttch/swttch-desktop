import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
export function McpSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicMcp}><p className="py-5 text-sm text-muted">{copy.providerTopicPending}</p></SettingsSection>;
}
