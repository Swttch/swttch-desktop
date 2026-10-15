import { useSettingsCopy } from '../../../i18n';
import { SettingsSection } from '../../../SettingsControls';
import { BasicPermissionSettingItem } from './BasicPermissionSettingItem';
import { FullAccessSettingItem } from './FullAccessSettingItem';
export function PermissionsSection() { const copy = useSettingsCopy(); return <SettingsSection title={copy.permissions}><BasicPermissionSettingItem /><FullAccessSettingItem /></SettingsSection>; }
