import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
export function RemoteDesktopNotificationsSection() {
  const copy = useSettingsCopy();
  return <SettingsSection title={copy.topicRemoteDesktopNotifications}><p className="py-5 text-sm text-muted">{copy.providerTopicPending}</p></SettingsSection>;
}
