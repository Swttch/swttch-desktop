import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
export function EnterpriseManagedSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicEnterpriseManaged}><p className="py-5 text-sm text-muted">{copy.providerTopicPending}</p></SettingsSection>;
}
