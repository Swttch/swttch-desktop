import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
export function ToolsSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicTools}><p className="py-5 text-sm text-muted">{copy.providerTopicPending}</p></SettingsSection>;
}
