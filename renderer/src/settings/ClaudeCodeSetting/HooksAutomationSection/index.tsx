import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
export function HooksAutomationSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicHooksAutomation}><p className="py-5 text-sm text-muted">{copy.providerTopicPending}</p></SettingsSection>;
}
