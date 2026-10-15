import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsSection } from '../../../SettingsControls';
import { BasicPermissionSettingItem } from './BasicPermissionSettingItem';
import { FullAccessSettingItem } from './FullAccessSettingItem';
export function PermissionsSection() { return <SettingsSection title={copy.permissions}><BasicPermissionSettingItem /><FullAccessSettingItem /></SettingsSection>; }
