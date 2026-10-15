import { settingsCopy as copy } from '../../../../../src/locales/settings.ko.mjs';
import { SettingsRow, SettingsSwitch } from '../../../SettingsControls';

export function BasicPermissionSettingItem() { return <SettingsRow pending title={copy.basicPermission} description={copy.basicPermissionDescription}><SettingsSwitch label={copy.basicPermission} disabled /></SettingsRow>; }
