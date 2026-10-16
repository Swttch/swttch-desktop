import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
export function AuthenticationProvidersSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicAuthenticationProviders}><p className="py-5 text-sm text-muted">{copy.providerTopicPending}</p></SettingsSection>;
}
